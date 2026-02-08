export function parseDateRanges(rawRanges) {
  if (!rawRanges || rawRanges.length === 0) {
    return [];
  }

  const list = Array.isArray(rawRanges) ? rawRanges : [rawRanges];
  const ranges = [];

  for (const raw of list) {
    if (!raw) continue;
    const trimmed = String(raw).trim();
    if (!trimmed) continue;

    const parts = trimmed.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid range "${trimmed}". Use YYYY-MM-DD:YYYY-MM-DD`);
    }

    const start = parts[0] ? parts[0].trim() : null;
    const end = parts[1] ? parts[1].trim() : null;

    if (!start && !end) {
      throw new Error(`Invalid range "${trimmed}". Provide a start or end date.`);
    }

    if (start && end && start > end) {
      throw new Error(`Invalid range "${trimmed}". Start date is after end date.`);
    }

    ranges.push({ start, end, raw: trimmed });
  }

  return ranges;
}

export function isDateInRanges(date, ranges) {
  if (!ranges || ranges.length === 0) {
    return true;
  }

  for (const range of ranges) {
    if (range.start && date < range.start) {
      continue;
    }
    if (range.end && date > range.end) {
      continue;
    }
    return true;
  }

  return false;
}
