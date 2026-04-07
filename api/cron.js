import { fetchAllMatches, fetchTeams } from '../src/api-client.js';
import { transformMatches } from '../src/match-transformer.js';
import { generateIcal } from '../src/ical-generator.js';
import { uploadCalendar } from '../src/blob-uploader.js';

export default async function handler(req, res) {
    // 1. Validate CRON_SECRET for security
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).send('Unauthorized');
    }

    try {
        // 2. Fetch raw match data and teams in parallel
        console.log('Fetching matches and teams...');
        const [matches, teams] = await Promise.all([
            fetchAllMatches(),
            fetchTeams()
        ]);
        console.log(`Fetched ${matches.length} matches and ${teams.length} teams.`);

        // 3. Transform data to events
        const events = transformMatches(matches, teams);

        // 4. Safety check point: Abort if fewer than 50 events to prevent overriding a good calendar with empty data accidentally
        if (events.length < 50) {
            console.error(`Safety abort: Only found ${events.length} events. Requires at least 50.`);
            return res.status(500).send('Insufficient events found; aborted upload');
        }

        // 5. Generate iCal string
        const icalString = generateIcal(events);

        // 6. Upload output to Vercel Blob
        const url = await uploadCalendar(icalString);

        // 7. Success
        return res.status(200).json({ success: true, url });

    } catch (error) {
        console.error('CRON Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
