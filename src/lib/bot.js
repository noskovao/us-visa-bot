import { VisaHttpClient } from './client.js';
import { log } from './utils.js';
import { isDateInRanges } from './dateRanges.js';

export class Bot {
  constructor(config, options = {}) {
    this.config = config;
    this.dryRun = options.dryRun || false;
    this.client = new VisaHttpClient(this.config.countryCode, this.config.email, this.config.password);
  }

  async initialize() {
    log('Initializing visa bot...');
    return await this.client.login();
  }

  async checkAvailableDate(sessionHeaders, currentBookedDate, minDate, dateRanges = []) {
    const dates = await this.client.checkAvailableDate(
      sessionHeaders,
      this.config.scheduleId,
      this.config.facilityId
    );

    if (!dates || dates.length === 0) {
      log("no dates available");
      return null;
    }

    // Filter dates that are better than current booked date and after minimum date
    const goodDates = dates.filter(date => {
      if (date >= currentBookedDate) {
        log(`date ${date} is further than already booked (${currentBookedDate})`);
        return false;
      }

      if (minDate && date < minDate) {
        log(`date ${date} is before minimum date (${minDate})`);
        return false;
      }

      if (!isDateInRanges(date, dateRanges)) {
        log(`date ${date} is outside allowed ranges`);
        return false;
      }

      return true;
    });

    if (goodDates.length === 0) {
      log("no good dates found after filtering");
      return null;
    }

    // Sort dates and return the earliest one
    goodDates.sort();

    const rangePreferredDates = this.pickRangePreferredDates(goodDates, dateRanges);
    const preferred = this.filterPreferredWeekdays(rangePreferredDates);
    const chosenDate = preferred.length > 0 ? preferred[0] : rangePreferredDates[0];

    if (preferred.length > 0) {
      log(
        `found ${goodDates.length} good dates: ${goodDates.join(', ')}, ` +
          `range-preferred: ${rangePreferredDates.join(', ')}, ` +
          `preferred weekdays: ${preferred.join(', ')}, using: ${chosenDate}`
      );
    } else {
      log(
        `found ${goodDates.length} good dates: ${goodDates.join(', ')}, ` +
          `range-preferred: ${rangePreferredDates.join(', ')}, using earliest: ${chosenDate}`
      );
    }

    return chosenDate;
  }

  async bookAppointment(sessionHeaders, date) {
    const time = await this.client.checkAvailableTime(
      sessionHeaders,
      this.config.scheduleId,
      this.config.facilityId,
      date
    );

    if (!time) {
      log(`no available time slots for date ${date}`);
      return false;
    }

    if (this.dryRun) {
      log(`[DRY RUN] Would book appointment at ${date} ${time} (not actually booking)`);
      return true;
    }

    await this.client.book(
      sessionHeaders,
      this.config.scheduleId,
      this.config.facilityId,
      date,
      time
    );

    log(`booked time at ${date} ${time}`);
    return true;
  }

  filterPreferredWeekdays(dates) {
    const preferred = this.normalizePreferredWeekdays(this.config.preferredWeekdays);
    if (preferred.size === 0) {
      return [];
    }

    return dates.filter(date => preferred.has(this.getWeekdayIndex(date)));
  }

  pickRangePreferredDates(dates, ranges) {
    if (!ranges || ranges.length === 0) {
      return dates;
    }

    for (const range of ranges) {
      const inRange = dates.filter(date => this.isDateInRange(date, range));
      if (inRange.length > 0) {
        return inRange;
      }
    }

    return dates;
  }

  isDateInRange(date, range) {
    if (range.start && date < range.start) {
      return false;
    }
    if (range.end && date > range.end) {
      return false;
    }
    return true;
  }

  normalizePreferredWeekdays(values) {
    const map = new Map([
      ['sun', 0],
      ['mon', 1],
      ['tue', 2],
      ['wed', 3],
      ['thu', 4],
      ['fri', 5],
      ['sat', 6]
    ]);

    const result = new Set();
    for (const raw of values || []) {
      const v = String(raw).trim().toLowerCase();
      if (!v) continue;
      if (map.has(v)) {
        result.add(map.get(v));
        continue;
      }
      const num = Number(v);
      if (Number.isInteger(num) && num >= 0 && num <= 6) {
        result.add(num);
      }
    }
    return result;
  }

  getWeekdayIndex(date) {
    // Use UTC to avoid timezone shifting the day.
    return new Date(`${date}T00:00:00Z`).getUTCDay();
  }
}
