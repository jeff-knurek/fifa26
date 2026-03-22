import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '../teams.json'), 'utf8'));

function getTeamDetails(teamName) {
    if (!teamName) return { title: 'TBD', name: 'TBD' };
    // preference to use name_normalised if available
    const team = teams.find(t => t.name_normalised === teamName || t.name === teamName);
    if (team && team.flag_icon && team.fifa_code) {
        return { title: `${team.flag_icon} ${team.fifa_code}`, name: team.name };
    }
    return { title: teamName, name: teamName };
}

export function transformMatches(matches) {
    return matches.map((match, index) => {
        const team1Details = getTeamDetails(match.team1);
        const team2Details = getTeamDetails(match.team2);

        const title = `${team1Details.title} vs ${team2Details.title}`;

        // Parse time and timezone, e.g., "13:00 UTC-6"
        let timeString = '18:00:00Z';
        if (match.time) {
            const matchResult = match.time.match(/^(\d{2}:\d{2})(?:\s*UTC([+-]\d+))?/);
            if (matchResult) {
                const time = matchResult[1];
                const tzOffset = matchResult[2]; // e.g., '-6'
                if (tzOffset) {
                    const sign = tzOffset[0];
                    const num = Math.abs(parseInt(tzOffset, 10));
                    timeString = `${time}:00${sign}${num.toString().padStart(2, '0')}:00`;
                } else {
                    timeString = `${time}:00Z`; // fallback
                }
            } else {
                timeString = `${match.time.split(' ')[0]}:00Z`;
            }
        }

        const startDate = new Date(`${match.date}T${timeString}`);
        const endDate = new Date(startDate.getTime() + 90 * 60000); // +90 mins

        const location = typeof match.ground === 'string'
            ? match.ground
            : (match.ground?.name?.[0] || 'TBD');

        const originalDescription = [match.round, match.group].filter(Boolean).join(' ');
        const description = `${team1Details.name} vs ${team2Details.name}\n${originalDescription}`.trim();

        return {
            id: index + 1,
            uid: `match-${index + 1}@fifa26.calendar`,
            title,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            location,
            description
        };
    });
}
