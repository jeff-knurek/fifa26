# ⚽ FIFA World Cup 2026 Calendar

Use the Subscribe link below to add a live-updating iCal feed of every FIFA World Cup 2026 match.

**→ [Subscribe to the calendar](https://mi0yvaaaf99owg1f.public.blob.vercel-storage.com/fifa-worldcup-2026.ics)**

Works with Google Calendar, Apple Calendar, Outlook, and anything that accepts a `.ics` URL.

**NOTE**: Scores are NOT updated live. They are only updated 3 days after the match. This means your calendar won't leak what happened before you get a chance to watch.

**NOTE**: The calendar is only updated once a day. Don't panic if your calendar isn't updated immediately after a match.

---

## How it works: The nitty gritty details

The calendar file is hosted on [Vercel](https://vercel.com/). A cron job runs daily, reads data from [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json), converts it to iCal format, and publishes/updates the `.ics` file.

---

## For contributors

### Run locally

#### Prerequisites
- Node.js 18+

```bash
git clone https://github.com/your-username/fifa26.git
cd fifa26
npm install
cp .env.example .env
# Add your BLOB_READ_WRITE_TOKEN to .env
npm run dev        # generates worldcup2026.ics locally
```

### Deploy

#### Prerequisites
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) token (for uploading) to public storage.
- `npm install -g vercel`

```bash
vercel link
vercel --prod
```


#### Post-deploy test
_check returned URL serves valid .ics_
```bash
# The production URL was printed out when you ran `vercel --prod` and ends with `.vercel.app`
curl https://your-project.vercel.app/api/cron
```
_subscribe to the URL in Google Calendar / macOS Calendar_

---

## Data

Match data is sourced from the [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) project. Quality and availability of the data is not guaranteed.

---

## Licence

[LICENSE.md](LICENSE.md)
