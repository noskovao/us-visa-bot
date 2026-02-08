import dotenv from 'dotenv';

dotenv.config();

export function getConfig() {
  const config = {
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
    scheduleId: process.env.SCHEDULE_ID,
    facilityId: process.env.FACILITY_ID,
    countryCode: process.env.COUNTRY_CODE,
    refreshDelay: Number(process.env.REFRESH_DELAY || 3),
    authRetryDelaySeconds: Number(process.env.AUTH_RETRY_DELAY || 10),
    authRetryMax: Number(process.env.AUTH_RETRY_MAX || 5),
    authRetryBackoff: Number(process.env.AUTH_RETRY_BACKOFF || 2),
    authRetryMaxDelaySeconds: Number(process.env.AUTH_RETRY_MAX_DELAY || 300),
    preferredWeekdays: (process.env.PREFERRED_WEEKDAYS || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
  };

  validateConfig(config);
  return config;
}

function validateConfig(config) {
  const required = ['email', 'password', 'scheduleId', 'facilityId', 'countryCode'];
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.map(k => k.toUpperCase()).join(', ')}`);
    process.exit(1);
  }
}

export function getBaseUri(countryCode) {
  return `https://ais.usvisa-info.com/en-${countryCode}/niv`;
}
