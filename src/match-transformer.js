export function transformMatches(matches) {
    return matches.map((match, index) => {
        const title = `${match.team1 || 'TBD'} vs ${match.team2 || 'TBD'}`;

        // JSON only has date, e.g., "2026-06-11". Let's assume 18:00:00Z start time
        const startDate = new Date(`${match.date}T18:00:00Z`);
        const endDate = new Date(startDate.getTime() + 90 * 60000); // +90 mins

        const location = match.ground?.name?.[0] || 'TBD';
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
