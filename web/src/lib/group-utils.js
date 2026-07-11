/** @param {string|undefined} dob — ISO date string e.g. "2000-05-17" */
function calcAge(dob) {
	if (!dob) return null;
	const today = new Date();
	const birth = new Date(dob);
	let age = today.getFullYear() - birth.getFullYear();
	const monthDiff = today.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
	return age;
}

/**
 * Accumulates W/D/L/GF/GA for each team from group-stage matches only.
 * @param {any[]} matches
 * @returns {Record<string, {w:number,d:number,l:number,gf:number,ga:number}>}
 */
export function buildStandings(matches) {
	/** @type {Record<string, {w:number,d:number,l:number,gf:number,ga:number}>} */
	const standings = {};

	const init = (name) => {
		if (!standings[name]) standings[name] = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
	};

	for (const match of matches) {
		if (!match.score?.ft) continue;
		if (!match.group) continue;

		const [g1, g2] = match.score.ft;
		const t1 = match.team1;
		const t2 = match.team2;
		init(t1);
		init(t2);

		standings[t1].gf += g1;
		standings[t1].ga += g2;
		standings[t2].gf += g2;
		standings[t2].ga += g1;

		if (g1 > g2) { standings[t1].w += 1; standings[t2].l += 1; }
		else if (g2 > g1) { standings[t2].w += 1; standings[t1].l += 1; }
		else { standings[t1].d += 1; standings[t2].d += 1; }
	}

	return standings;
}

/**
 * Builds a lookup of players indexed by team name and FIFA code.
 * @param {any[]} squads
 * @returns {Record<string, any[]>}
 */
export function buildSquadMap(squads) {
	/** @type {Record<string, any[]>} */
	const squadByName = {};
	for (const team of squads) {
		squadByName[team.name] = team.players;
		if (team.fifa_code) squadByName[team.fifa_code] = team.players;
	}
	return squadByName;
}

/**
 * Assembles the full groups data array used by the GroupStage component.
 * @param {{
 *   groups: any[],
 *   matches: any[],
 *   teamsInfo: any[],
 *   squads: any[],
 *   flagByCode: Record<string,string>,
 *   flagByName: Record<string,string>
 * }} options
 * @returns {Array<{name:string, teams:any[]}>}
 */
export function computeGroupsData({ groups, matches, teamsInfo, squads, flagByCode, flagByName }) {
	const standings = buildStandings(matches);
	const squadByName = buildSquadMap(squads);

	return groups.map((group) => {
		const teams = group.teams.map((teamName) => {
			const stats = standings[teamName] || { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
			const points = stats.w * 3 + stats.d;
			const gd = stats.gf - stats.ga;
			const teamInfo = teamsInfo.find((t) => t.name === teamName);
			const squadPlayers = squadByName[teamName] || squadByName[teamInfo?.fifa_code] || [];
			const players = squadPlayers.map((p) => ({
				...p,
				club: { ...p.club, flag: flagByCode[p.club?.country] || null },
				age: calcAge(p.date_of_birth)
			}));
			players.sort((a, b) => a.number - b.number);

			return {
				name: teamName,
				fifaCode: teamInfo?.fifa_code || '',
				flag: teamInfo?.flag_icon || flagByName[teamName] || '',
				...stats,
				points,
				gd,
				players
			};
		});

		teams.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			if (b.gd !== a.gd) return b.gd - a.gd;
			if (b.gf !== a.gf) return b.gf - a.gf;
			return a.name.localeCompare(b.name);
		});

		return { name: group.name, teams };
	});
}

/**
 * Ranks all 3rd-place finishers from groupsData and returns the top 8
 * (points → GD → GF → name).
 * @param {Array<{name:string, teams:any[]}>} groupsData
 */
export function rankThirdPlace(groupsData) {
	return groupsData
		.filter((g) => g.teams[2])
		.map((g) => ({ ...g.teams[2], groupLetter: g.name.split(' ')[1] }))
		.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			if (b.gd !== a.gd) return b.gd - a.gd;
			if (b.gf !== a.gf) return b.gf - a.gf;
			return a.name.localeCompare(b.name);
		})
		.slice(0, 8);
}
