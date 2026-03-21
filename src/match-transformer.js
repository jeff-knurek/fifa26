export function transformMatches(matches) {
    return matches.map((match, index) => {
        const title = `${match.team1 || 'TBD'} vs ${match.team2 || 'TBD'}`;

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
        const description = [match.round, match.group].filter(Boolean).join(' ');

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
