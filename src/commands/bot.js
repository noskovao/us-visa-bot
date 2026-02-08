import { Bot } from '../lib/bot.js';
import { getConfig } from '../lib/config.js';
import { log, sleep, isSocketHangupError } from '../lib/utils.js';
import { parseDateRanges } from '../lib/dateRanges.js';

const COOLDOWN = 3600; // 1 hour in seconds

export async function botCommand(options) {
  const config = getConfig();
  const bot = new Bot(config, { dryRun: options.dryRun });
  let currentBookedDate = options.current;
  const targetDate = options.target;
  const minDate = options.min;
  let dateRanges = [];
  let authRetryCount = 0;
  let authRetryDelay = config.authRetryDelaySeconds;

  log(`Initializing with current date ${currentBookedDate}`);

  if (options.dryRun) {
    log(`[DRY RUN MODE] Bot will only log what would be booked without actually booking`);
  }

  if (targetDate) {
    log(`Target date: ${targetDate}`);
  }

  if (minDate) {
    log(`Minimum date: ${minDate}`);
  }

  try {
    dateRanges = parseDateRanges(options.range);
  } catch (err) {
    log(`Invalid date range: ${err.message}`);
    process.exit(1);
  }

  if (dateRanges.length > 0) {
    log(`Acceptable date ranges: ${dateRanges.map(r => r.raw).join(', ')}`);
  }

  while (true) {
    try {
      const sessionHeaders = await bot.initialize();
      authRetryCount = 0;
      authRetryDelay = config.authRetryDelaySeconds;

      while (true) {
        const availableDate = await bot.checkAvailableDate(
          sessionHeaders,
          currentBookedDate,
          minDate,
          dateRanges
        );

        if (availableDate) {
          const booked = await bot.bookAppointment(sessionHeaders, availableDate);

          if (booked) {
            // Update current date to the new available date
            currentBookedDate = availableDate;

            options = {
              ...options,
              current: currentBookedDate
            };

            if (options.stopAfterBook) {
              log(`Booked appointment on ${availableDate}. Exiting because --stop-after-book is set.`);
              process.exit(0);
            }

            if (targetDate && availableDate <= targetDate) {
              log(`Target date reached! Successfully booked appointment on ${availableDate}`);
              process.exit(0);
            }
          }
        }

        await sleep(config.refreshDelay);
      }
    } catch (err) {
      if (isSocketHangupError(err)) {
        log(`Socket hangup error: ${err.message}. Trying again after ${COOLDOWN} seconds...`);
        await sleep(COOLDOWN);
        continue;
      }

      authRetryCount += 1;
      const cappedDelay = Math.min(authRetryDelay, config.authRetryMaxDelaySeconds);
      log(
        `Session/authentication error: ${err.message}. Retrying in ${cappedDelay} seconds (attempt ${authRetryCount}/${config.authRetryMax}).`
      );
      await sleep(cappedDelay);
      authRetryDelay = Math.min(authRetryDelay * config.authRetryBackoff, config.authRetryMaxDelaySeconds);

      if (config.authRetryMax > 0 && authRetryCount >= config.authRetryMax) {
        log(`Too many auth errors. Cooling down for ${COOLDOWN} seconds...`);
        await sleep(COOLDOWN);
        authRetryCount = 0;
        authRetryDelay = config.authRetryDelaySeconds;
      }
    }
  }
}
