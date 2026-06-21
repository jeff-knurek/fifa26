/**
 * @param {any[]} matches
 * @param {any[]} teamsInfo
 * @returns {{ name: string, team: string, teamFlag: string, teamCode: string, goals: number }[]}
 */
export function computeTopScorers(matches, teamsInfo) {
	const teamByName = {};
	for (const t of teamsInfo) {
		teamByName[t.name] = t;
		if (t.name_normalised) teamByName[t.name_normalised] = t;
	}

	/** @type {Record<string, { name: string, team: string, teamFlag: string, teamCode: string, goals: number }>} */
	const scorers = {};

	const processGoals = (goals, teamName) => {
		if (!Array.isArray(goals)) return;
		const team = teamByName[teamName] || null;
		for (const goal of goals) {
			if (!goal.name || goal.owngoal) continue;
			if (!scorers[goal.name]) {
				scorers[goal.name] = {
					name: goal.name,
					team: team?.name || teamName || '—',
					teamFlag: team?.flag_icon || '',
					teamCode: team?.fifa_code || '',
					goals: 0
				};
			}
			scorers[goal.name].goals++;
		}
	};

	for (const match of matches) {
		processGoals(match.goals1, match.team1);
		processGoals(match.goals2, match.team2);
	}

	return Object.values(scorers).sort((a, b) => {
		if (b.goals !== a.goals) return b.goals - a.goals;
		return a.name.localeCompare(b.name);
	});
}
