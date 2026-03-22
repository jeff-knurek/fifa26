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

        // check for score data in json, and add to title, then later the description
        // if match day is less than 3 days ago, do not show the score in the title or description
        let score = '';
        const today = new Date();
        const matchDate = new Date(match.date);
        const diffInDays = Math.floor((today - matchDate) / (1000 * 60 * 60 * 24));
        if (diffInDays >= 3 && match.score && match.score.ft) {
            score = ` ${match.score.ft[0]}-${match.score.ft[1]}`;
        }

        const title = `${team1Details.title} vs ${team2Details.title}${score}`;

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

        const descriptionLines = match.group
            ? [match.group, `${team1Details.name} vs ${team2Details.name}`, match.round]
            : [match.round, `${team1Details.name} vs ${team2Details.name}`];

        const validLines = descriptionLines.filter(Boolean);

        if (diffInDays >= 3 && match.score && match.score.ft) {
            validLines.push(`Score: ${match.score.ft[0]}-${match.score.ft[1]}`);

            const formatGoal = (goal) => {
                const offset = goal.offset ? `+${goal.offset}` : '';
                const penalty = goal.penalty ? ' (P)' : '';
                return `${goal.name} (${goal.minute}${offset}min)${penalty}`;
            };

            // add goals to description for each team
            if (match.goals1 && match.goals1.length > 0) {
                validLines.push(...match.goals1.map(formatGoal));
            }
            if (match.goals2 && match.goals2.length > 0) {
                validLines.push(...match.goals2.map(formatGoal));
            }
        } else if (diffInDays >= 0) {
            validLines.push(`Score: PENDING`);
        }

        const description = validLines.join('\n');

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
