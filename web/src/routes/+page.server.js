import { computeTopScorers } from '../lib/scorer-utils.js';

const BASE = 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const [matchData, teamsInfo, groups, squads] = await Promise.all([
		fetch(`${BASE}/worldcup.json`).then((r) => r.json()),
		fetch(`${BASE}/worldcup.teams.json`).then((r) => r.json()),
		fetch(`${BASE}/worldcup.groups.json`).then((r) => r.json()),
		fetch(`${BASE}/worldcup.squads.json`).then((r) => r.json()),
	]);

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

	const scorers = computeTopScorers(matchData.matches, teamsInfo);

	// ── Knockout bracket resolution ──────────────────────────────────────────

	// group letter -> sorted teams (already sorted: 1st, 2nd, 3rd, 4th)
	/** @type {Record<string, typeof groupsData[0]['teams']>} */
	const groupMap = {};
	for (const g of groupsData) {
		const letter = g.name.split(' ')[1];
		groupMap[letter] = g.teams;
	}

	// Rank all 3rd-place teams, top 8 advance
	const qualifiedThirdPlace = Object.entries(groupMap)
		.filter(([, teams]) => teams[2])
		.map(([letter, teams]) => ({ ...teams[2], groupLetter: letter }))
		.sort((a, b) => {
			if (b.points !== a.points) return b.points - a.points;
			if (b.gd !== a.gd) return b.gd - a.gd;
			if (b.gf !== a.gf) return b.gf - a.gf;
			return a.name.localeCompare(b.name);
		})
		.slice(0, 8);

	/** @type {Record<number, {name:string,flag:string}>} */
	const matchWinners = {};
	/** @type {Record<number, {name:string,flag:string}>} */
	const matchLosers = {};

	function isCode(s) {
		return /^[WL]\d+$/.test(s);
	}

	/** @param {string} code @returns {{name:string,flag:string}|null} */
	function resolveCode(code) {
		const w = code.match(/^W(\d+)$/);
		if (w) return matchWinners[+w[1]] ?? null;
		const l = code.match(/^L(\d+)$/);
		if (l) return matchLosers[+l[1]] ?? null;
		return null;
	}

	const koRawMatches = matchData.matches.filter((m) => !m.group);
	const ROUND_ORDER = [
		'Round of 32',
		'Round of 16',
		'Quarter-final',
		'Semi-final',
		'Match for third place',
		'Final'
	];

	const knockoutRounds = ROUND_ORDER.map((roundName) => ({
		name: roundName,
		matches: koRawMatches
			.filter((m) => m.round === roundName)
			.map((m) => {
				const raw1 = m.team1;
				const raw2 = m.team2;
				const t1 = isCode(raw1) ? resolveCode(raw1) : { name: raw1, flag: flagByName[raw1] ?? '' };
				const t2 = isCode(raw2) ? resolveCode(raw2) : { name: raw2, flag: flagByName[raw2] ?? '' };
				const score = m.score?.ft ?? null;

				if (score && t1 && t2) {
					const [g1, g2] = score;
					if (g1 > g2) { matchWinners[m.num] = t1; matchLosers[m.num] = t2; }
					else if (g2 > g1) { matchWinners[m.num] = t2; matchLosers[m.num] = t1; }
				}

				return {
					num: m.num,
					date: m.date,
					ground: m.ground,
					team1: { name: t1?.name ?? raw1, flag: t1?.flag ?? '', resolved: !!t1, confirmed: !isCode(raw1), code: isCode(raw1) ? raw1 : null },
					team2: { name: t2?.name ?? raw2, flag: t2?.flag ?? '', resolved: !!t2, confirmed: !isCode(raw2), code: isCode(raw2) ? raw2 : null },
					score
				};
			})
	}));

	// Reorder each round's matches so adjacent pairs feed the correct next-round slot.
	// CSS connectors use nth-child(odd/even) pairing, so slot[0]+slot[1] must both
	// feed the same next-round match, slot[2]+slot[3] the next, etc.
	// We do a DFS from the Final through W{num} codes to produce correct bracket order.
	const matchByNum = new Map();
	for (const round of knockoutRounds) {
		for (const m of round.matches) matchByNum.set(m.num, m);
	}

	function srcNums(match) {
		const s1 = match.team1.code?.match(/^W(\d+)$/);
		const s2 = match.team2.code?.match(/^W(\d+)$/);
		return [s1 ? +s1[1] : null, s2 ? +s2[1] : null];
	}

	function bracketOrder(matchNum, targetDepth, depth = 0) {
		if (depth === targetDepth) return [matchNum];
		const match = matchByNum.get(matchNum);
		if (!match) return [];
		const [s1, s2] = srcNums(match);
		return [
			...(s1 ? bracketOrder(s1, targetDepth, depth + 1) : []),
			...(s2 ? bracketOrder(s2, targetDepth, depth + 1) : [])
		];
	}

	const roundDepths = { 'Final': 0, 'Semi-final': 1, 'Quarter-final': 2, 'Round of 16': 3, 'Round of 32': 4 };
	const finalMatch = knockoutRounds.find((r) => r.name === 'Final')?.matches[0];
	if (finalMatch) {
		for (const round of knockoutRounds) {
			const depth = roundDepths[round.name];
			if (depth === undefined) continue;
			const orderedNums = bracketOrder(finalMatch.num, depth, 0);
			const matchMap = new Map(round.matches.map((m) => [m.num, m]));
			round.matches = orderedNums.map((n) => matchMap.get(n)).filter(Boolean);
		}
	}

	const qualifiedThirdNames = qualifiedThirdPlace.map((t) => t.name);

	return { groups: groupsData, scorers, knockoutRounds, qualifiedThirdNames };
}
