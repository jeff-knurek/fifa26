const ROUND_ORDER = [
	'Round of 32',
	'Round of 16',
	'Quarter-final',
	'Semi-final',
	'Match for third place',
	'Final'
];

const ROUND_DEPTHS = {
	Final: 0,
	'Semi-final': 1,
	'Quarter-final': 2,
	'Round of 16': 3,
	'Round of 32': 4
};

/** Returns true for W{n} and L{n} placeholder codes. */
export function isCode(s) {
	return /^[WL]\d+$/.test(s);
}

/**
 * Resolves a raw team string to {name, flag}. Returns null when a W/L code
 * references a match that hasn't been played yet.
 * @param {string} raw
 * @param {Record<string,string>} flagByName
 * @param {Record<number,{name:string,flag:string}>} matchWinners
 * @param {Record<number,{name:string,flag:string}>} matchLosers
 * @returns {{name:string,flag:string}|null}
 */
export function resolveTeam(raw, flagByName, matchWinners, matchLosers) {
	if (!isCode(raw)) return { name: raw, flag: flagByName[raw] ?? '' };
	const w = raw.match(/^W(\d+)$/);
	if (w) return matchWinners[+w[1]] ?? null;
	const l = raw.match(/^L(\d+)$/);
	if (l) return matchLosers[+l[1]] ?? null;
	return null;
}

/**
 * Reorders each round's matches so adjacent pairs feed the correct next-round
 * slot (DFS from the Final through W{n} codes). Mutates round.matches in place.
 * @param {Array<{name:string, matches:any[]}>} knockoutRounds
 */
export function reorderByBracket(knockoutRounds) {
	const matchByNum = new Map();
	for (const round of knockoutRounds) {
		for (const m of round.matches) matchByNum.set(m.num, m);
	}

	function srcNums(match) {
		const s1 = match.team1.code?.match(/^W(\d+)$/);
		const s2 = match.team2.code?.match(/^W(\d+)$/);
		return [s1 ? +s1[1] : null, s2 ? +s2[1] : null];
	}

	function order(matchNum, targetDepth, depth = 0) {
		if (depth === targetDepth) return [matchNum];
		const match = matchByNum.get(matchNum);
		if (!match) return [];
		const [s1, s2] = srcNums(match);
		return [
			...(s1 ? order(s1, targetDepth, depth + 1) : []),
			...(s2 ? order(s2, targetDepth, depth + 1) : [])
		];
	}

	const finalMatch = knockoutRounds.find((r) => r.name === 'Final')?.matches[0];
	if (!finalMatch) return;

	for (const round of knockoutRounds) {
		const depth = ROUND_DEPTHS[round.name];
		if (depth === undefined) continue;
		const orderedNums = order(finalMatch.num, depth);
		const matchMap = new Map(round.matches.map((m) => [m.num, m]));
		round.matches = orderedNums.map((n) => matchMap.get(n)).filter(Boolean);
	}
}

/**
 * @param {{
 *   matches: any[],
 *   groupsData: Array<{name: string, teams: any[]}>,
 *   flagByName: Record<string, string>
 * }} options
 * @returns {{ knockoutRounds: any[] }}
 */
export function computeKnockoutData({ matches, groupsData, flagByName }) {
	/** @type {Record<number, {name:string,flag:string}>} */
	const matchWinners = {};
	/** @type {Record<number, {name:string,flag:string}>} */
	const matchLosers = {};

	const koRawMatches = matches.filter((m) => !m.group);

	const knockoutRounds = ROUND_ORDER.map((roundName) => ({
		name: roundName,
		matches: koRawMatches
			.filter((m) => m.round === roundName)
			.map((m) => {
				const t1 = resolveTeam(m.team1, flagByName, matchWinners, matchLosers);
				const t2 = resolveTeam(m.team2, flagByName, matchWinners, matchLosers);
				const score = m.score?.ft ?? null;
				const penalties = m.score?.p ?? null;

				if (score && t1 && t2) {
					const [g1, g2] = score;
					if (g1 > g2) { matchWinners[m.num] = t1; matchLosers[m.num] = t2; }
					else if (g2 > g1) { matchWinners[m.num] = t2; matchLosers[m.num] = t1; }
					else if (penalties) {
						const [p1, p2] = penalties;
						if (p1 > p2) { matchWinners[m.num] = t1; matchLosers[m.num] = t2; }
						else if (p2 > p1) { matchWinners[m.num] = t2; matchLosers[m.num] = t1; }
					}
				}

				return {
					num: m.num,
					date: m.date,
					ground: m.ground,
					team1: { name: t1?.name ?? m.team1, flag: t1?.flag ?? '', resolved: !!t1, confirmed: !isCode(m.team1), code: isCode(m.team1) ? m.team1 : null },
					team2: { name: t2?.name ?? m.team2, flag: t2?.flag ?? '', resolved: !!t2, confirmed: !isCode(m.team2), code: isCode(m.team2) ? m.team2 : null },
					score,
					penalties
				};
			})
	}));

	reorderByBracket(knockoutRounds);

	return { knockoutRounds };
}
