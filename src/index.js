import fs from 'fs/promises';
import { fetchAllMatches } from './api-client.js';
import { transformMatches } from './match-transformer.js';
import { generateIcal } from './ical-generator.js';

async function main() {
    console.log('⚽ Fetching World Cup matches from local JSON...');
    const matches = await fetchAllMatches();

    console.log(`✅ Found ${matches.length} matches. Transforming to events...`);
    const events = transformMatches(matches);

    console.log(`✅ Transformed ${events.length} events. Generating iCal string...`);
    const icalString = generateIcal(events);

    const outputPath = 'worldcup2026.ics';
    console.log(`💾 Writing calendar to ${outputPath}...`);
    await fs.writeFile(outputPath, icalString);

    console.log('🎉 Done! Check worldcup2026.ics');
}

main().catch(error => {
    console.error('❌ Failed to create calendar:', error);
    process.exit(1);
});
