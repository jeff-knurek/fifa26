import groupsJson from '../data/worldcup.groups.json';
import squadsJson from '../data/worldcup.squads.json';
import teamsJson from '../data/worldcup.teams.json';
import matchJson from '../data/worldcup.json';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	const groups = groupsJson;
	const squads = squadsJson;
	const teamsInfo = teamsJson;
	const matchData = matchJson;

	// Build flag map: fifa_code -> flag_icon, team name -> flag_icon
	/** @type {Record<string, string>} */
	const flagByCode = {};
	/** @type {Record<string, string>} */
	const flagByName = {};
	for (const t of teamsInfo) {
		if (t.flag_icon) {
			flagByCode[t.fifa_code] = t.flag_icon;
			flagByName[t.name] = t.flag_icon;
			if (t.name_normalised) flagByName[t.name_normalised] = t.flag_icon;
		}
	}

	// Build standings map: team name -> stats
	/** @type {Record<string, {w:number,d:number,l:number,gf:number,ga:number}>} */
	const standings = {};

	const initTeam = (name) => {
		if (!standings[name]) {
			standings[name] = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
		}
	};

	for (const match of matchData.matches) {
		if (!match.score || !match.score.ft) continue;
		if (!match.group) continue; // only group stage

		const [g1, g2] = match.score.ft;
		const t1 = match.team1;
		const t2 = match.team2;
		initTeam(t1);
		initTeam(t2);

		standings[t1].gf += g1;
		standings[t1].ga += g2;
		standings[t2].gf += g2;
		standings[t2].ga += g1;

		if (g1 > g2) {
			standings[t1].w += 1;
			standings[t2].l += 1;
		} else if (g1 < g2) {
			standings[t2].w += 1;
			standings[t1].l += 1;
		} else {
			standings[t1].d += 1;
			standings[t2].d += 1;
		}
	}

	// Build squad map: team name -> players (indexed by name and fifa_code)
	/** @type {Record<string, any[]>} */
	const squadByName = {};
	for (const team of squads) {
		squadByName[team.name] = team.players;
		if (team.fifa_code) squadByName[team.fifa_code] = team.players;
	}

	// Assemble final groups data
	const groupsData = groups.groups.map((group) => {
		const teams = group.teams.map((teamName) => {
			const stats = standings[teamName] || { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
			const points = stats.w * 3 + stats.d;
			const gd = stats.gf - stats.ga;
			const teamInfo = teamsInfo.find((t) => t.name === teamName);
			const squadPlayers = squadByName[teamName] || squadByName[teamInfo?.fifa_code] || [];
			const players = squadPlayers.map((p) => ({
				...p,
				club: {
					...p.club,
					flag: flagByCode[p.club?.country] || null
				}
			}));
			players.sort((a, b) => a.number - b.number);

			const flag = teamInfo?.flag_icon || flagByName[teamName] || '';
			const fifaCode = teamInfo?.fifa_code || '';

			return {
				name: teamName,
				fifaCode,
				flag,
				...stats,
				points,
				gd,
				players
			};
		});

		// Sort: points desc, gd desc, gf desc, name asc
		teams.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			if (b.gd !== a.gd) return b.gd - a.gd;
			if (b.gf !== a.gf) return b.gf - a.gf;
			return a.name.localeCompare(b.name);
		});

		return { name: group.name, teams };
	});

	return { groups: groupsData };
}
