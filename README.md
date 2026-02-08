# US Visa Bot 🤖

An automated bot that monitors and reschedules US visa interview appointments to get you an earlier date.

## Features

- 🔄 Continuously monitors available appointment slots
- 📅 Automatically books earlier dates when found  
- 🎯 Configurable target and minimum date constraints
- 🚨 Exits successfully when target date is reached
- 📊 Detailed logging with timestamps
- 🔐 Secure authentication with environment variables

## How It Works

The bot logs into your account on https://ais.usvisa-info.com/ and checks for available appointment dates every few seconds. When it finds a date earlier than your current booking (and within your specified constraints), it automatically reschedules your appointment.

## Prerequisites

- Node.js 16+ 
- A valid US visa interview appointment
- Access to https://ais.usvisa-info.com/

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/us-visa-bot.git
cd us-visa-bot
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Create a `.env` file in the project root with your credentials:

```env
EMAIL=your.email@example.com
PASSWORD=your_password
COUNTRY_CODE=your_country_code
SCHEDULE_ID=your_schedule_id
FACILITY_ID=your_facility_id
REFRESH_DELAY=3
AUTH_RETRY_DELAY=10
AUTH_RETRY_MAX=5
AUTH_RETRY_BACKOFF=2
AUTH_RETRY_MAX_DELAY=300
```

### Finding Your Configuration Values

| Variable | Description | How to Find |
|----------|-------------|-------------|
| `EMAIL` | Your login email | Your credentials for ais.usvisa-info.com |
| `PASSWORD` | Your login password | Your credentials for ais.usvisa-info.com |
| `COUNTRY_CODE` | Your country code | Found in URL: `https://ais.usvisa-info.com/en-{COUNTRY_CODE}/` <br>Examples: `br` (Brazil), `fr` (France), `de` (Germany) |
| `SCHEDULE_ID` | Your appointment schedule ID | Found in URL when rescheduling: <br>`https://ais.usvisa-info.com/en-{COUNTRY_CODE}/niv/schedule/{SCHEDULE_ID}/continue_actions` |
| `FACILITY_ID` | Your consulate facility ID | Found in network calls when selecting dates, or inspect the date selector dropdown <br>Example: Paris = `44` |
| `REFRESH_DELAY` | Seconds between checks | Optional, defaults to 3 seconds |
| `AUTH_RETRY_DELAY` | Seconds to wait before retrying after auth errors | Optional, defaults to 10 seconds |
| `AUTH_RETRY_MAX` | Max consecutive auth retries before a cooldown | Optional, defaults to 5 (0 = never cooldown) |
| `AUTH_RETRY_BACKOFF` | Backoff multiplier for auth retry delay | Optional, defaults to 2 |
| `AUTH_RETRY_MAX_DELAY` | Maximum auth retry delay in seconds | Optional, defaults to 300 seconds |

## Usage

Run the bot with your current appointment date:

```bash
node src/index.js -c <current_date> [-t <target_date>] [-m <min_date>] [--range <start:end>...]
```

### Command Line Arguments

| Flag | Long Form | Required | Description |
|------|-----------|----------|-------------|
| `-c` | `--current` | ✅ | Your current booked interview date (YYYY-MM-DD) |
| `-t` | `--target` | ❌ | Target date to stop at - exits successfully when reached |
| `-m` | `--min` | ❌ | Minimum acceptable date - skips dates before this |
| `-r` | `--range` | ❌ | Acceptable date range (YYYY-MM-DD:YYYY-MM-DD). Can be repeated |
|  | `--stop-after-book` | ❌ | Stop after the first successful booking |

### Examples

```bash
# Basic usage - reschedule to any earlier date
node src/index.js -c 2023-06-15

# With target date - stop when you get June 1st or earlier  
node src/index.js -c 2023-06-15 -t 2023-06-01

# With minimum date - only accept dates after May 1st
node src/index.js -c 2023-06-15 -m 2023-05-01

# With both constraints - only book between May 1st and June 1st
node src/index.js -c 2023-06-15 -t 2023-06-01 -m 2023-05-01

# Multiple ranges - only accept dates in May 1-10 or June 1-15
node src/index.js -c 2023-06-15 \
  --range 2023-05-01:2023-05-10 \
  --range 2023-06-01:2023-06-15

# Stop after first successful booking
node src/index.js -c 2023-06-15 --stop-after-book

# Get help
node src/index.js --help
```

## How It Behaves

The bot will:
1. **Log in** to your account using provided credentials
2. **Check** for available dates every few seconds
3. **Compare** found dates against your constraints:
   - Must be earlier than current date (`-c`)
   - Must be after minimum date (`-m`) if specified
   - Will exit successfully if target date (`-t`) is reached
4. **Book** the appointment automatically if conditions are met
5. **Continue** monitoring until target is reached or manually stopped (or stop immediately if `--stop-after-book` is set)

## Output Examples

```
[2023-07-16T10:30:00.000Z] Initializing with current date 2023-08-15
[2023-07-16T10:30:00.000Z] Target date: 2023-07-01
[2023-07-16T10:30:00.000Z] Minimum date: 2023-06-01
[2023-07-16T10:30:01.000Z] Logging in
[2023-07-16T10:30:03.000Z] nearest date is further than already booked (2023-08-15 vs 2023-09-01)
[2023-07-16T10:30:06.000Z] booked time at 2023-07-15 09:00
[2023-07-16T10:30:06.000Z] Target date reached! Successfully booked appointment on 2023-07-15
```

## Safety Features

- ✅ **Read-only until booking** - Only books when better dates are found
- ✅ **Respects constraints** - Won't book outside your specified date range
- ✅ **Graceful exit** - Stops automatically when target is reached
- ✅ **Optional single-book mode** - Use `--stop-after-book` to avoid multiple reschedules
- ✅ **Error recovery** - Automatically retries on network errors
- ✅ **Secure credentials** - Uses environment variables for sensitive data

## Docker (including TrueNAS)

You can run the bot continuously in Docker using the included `Dockerfile` and `docker-compose.yml`. The compose file is set to restart the container on failures only (`restart: on-failure`), so a successful booking with `--stop-after-book` will stop the container.

1. Create your `.env` file as described above.
2. Edit `docker-compose.yml` and set:
   - `CURRENT_DATE` (required)
   - `TARGET_DATE`, `MIN_DATE` (optional)
   - `DATE_RANGES` (optional, comma-separated, e.g. `2024-05-01:2024-05-10,2024-06-01:2024-06-15`)
   - `STOP_AFTER_BOOK` and/or `DRY_RUN` if desired
3. Build and run:
```bash
docker compose up -d --build
```

### TrueNAS notes

- On TrueNAS SCALE, you can use the built-in Docker/Apps system or a Compose app. Point it at this repository and set the same environment variables shown above.
- Make sure the container has a persistent `.env` and that `restart: unless-stopped` (or the UI equivalent) is enabled so it runs continuously.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the ISC License.

## Disclaimer

This bot is for educational purposes. Use responsibly and in accordance with the terms of service of the visa appointment system. The authors are not responsible for any misuse or consequences.
