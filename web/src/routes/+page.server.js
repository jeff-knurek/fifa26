import { computeTopScorers } from '../lib/scorer-utils.js';
import { computeKnockoutData } from '../lib/knockout-utils.js';
import { computeGroupsData, rankThirdPlace } from '../lib/group-utils.js';

const BASE = 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const [matchData, teamsInfo, groups, squads] = await Promise.all([
		fetch(`${BASE}/worldcup.json`).then((r) => r.json()),
		fetch(`${BASE}/worldcup.teams.json`).then((r) => r.json()),
		fetch(`${BASE}/worldcup.groups.json`).then((r) => r.json()),
		fetch(`${BASE}/worldcup.squads.json`).then((r) => r.json()),
	]);

	// Build flag maps: fifa_code -> flag_icon, team name -> flag_icon
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

	const groupsData = computeGroupsData({
		groups: groups.groups,
		matches: matchData.matches,
		teamsInfo,
		squads,
		flagByCode,
		flagByName
	});

	const scorers = computeTopScorers(matchData.matches, teamsInfo);
	const { knockoutRounds } = computeKnockoutData({ matches: matchData.matches, groupsData, flagByName });
	const qualifiedThirdNames = rankThirdPlace(groupsData).map((t) => t.name);

	return { groups: groupsData, scorers, knockoutRounds, qualifiedThirdNames };
}
