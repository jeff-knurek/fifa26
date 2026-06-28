import test from 'node:test';
import assert from 'node:assert';
import { buildStandings, buildSquadMap, computeGroupsData, rankThirdPlace } from './group-utils.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function groupMatch(t1, t2, score, group = 'A') {
	return { team1: t1, team2: t2, group, score: score ? { ft: score } : undefined };
}

function koMatch(t1, t2, score) {
	// no `group` property — knockout
	return { team1: t1, team2: t2, score: score ? { ft: score } : undefined };
}

// ── buildStandings ────────────────────────────────────────────────────────────

test('buildStandings: counts a win correctly', () => {
	const s = buildStandings([groupMatch('Brazil', 'Germany', [2, 0])]);
	assert.deepStrictEqual(s['Brazil'], { w: 1, d: 0, l: 0, gf: 2, ga: 0 });
	assert.deepStrictEqual(s['Germany'], { w: 0, d: 0, l: 1, gf: 0, ga: 2 });
});

test('buildStandings: counts a draw correctly', () => {
	const s = buildStandings([groupMatch('Brazil', 'Germany', [1, 1])]);
	assert.deepStrictEqual(s['Brazil'], { w: 0, d: 1, l: 0, gf: 1, ga: 1 });
	assert.deepStrictEqual(s['Germany'], { w: 0, d: 1, l: 0, gf: 1, ga: 1 });
});

test('buildStandings: accumulates across multiple matches', () => {
	const matches = [
		groupMatch('Brazil', 'Germany', [2, 1]),
		groupMatch('Brazil', 'France', [0, 0]),
		groupMatch('Germany', 'France', [1, 3])
	];
	const s = buildStandings(matches);
	assert.deepStrictEqual(s['Brazil'], { w: 1, d: 1, l: 0, gf: 2, ga: 1 });
	assert.deepStrictEqual(s['Germany'], { w: 0, d: 0, l: 2, gf: 2, ga: 5 });
	assert.deepStrictEqual(s['France'], { w: 1, d: 1, l: 0, gf: 3, ga: 1 });
});

test('buildStandings: skips matches without a score', () => {
	const s = buildStandings([groupMatch('Brazil', 'Germany', null)]);
	assert.deepStrictEqual(s, {});
});

test('buildStandings: skips knockout matches (no group property)', () => {
	const s = buildStandings([koMatch('Brazil', 'Germany', [3, 0])]);
	assert.deepStrictEqual(s, {});
});

test('buildStandings: ignores knockout matches even when mixed with group matches', () => {
	const matches = [
		groupMatch('Brazil', 'Germany', [2, 0]),
		koMatch('Brazil', 'France', [1, 0])
	];
	const s = buildStandings(matches);
	assert.ok('Brazil' in s);
	assert.ok('Germany' in s);
	assert.ok(!('France' in s));
	assert.strictEqual(s['Brazil'].w, 1); // only the group win counted
});

// ── buildSquadMap ────────────────────────────────────────────────────────────

test('buildSquadMap: indexes players by team name', () => {
	const squads = [{ name: 'Brazil', players: [{ name: 'Vinicius', number: 7 }] }];
	const map = buildSquadMap(squads);
	assert.strictEqual(map['Brazil'].length, 1);
	assert.strictEqual(map['Brazil'][0].name, 'Vinicius');
});

test('buildSquadMap: also indexes by fifa_code when present', () => {
	const squads = [{ name: 'Brazil', fifa_code: 'BRA', players: [{ name: 'Vinicius', number: 7 }] }];
	const map = buildSquadMap(squads);
	assert.strictEqual(map['BRA'], map['Brazil']);
});

test('buildSquadMap: skips fifa_code index when absent', () => {
	const squads = [{ name: 'Brazil', players: [] }];
	const map = buildSquadMap(squads);
	assert.ok(!('undefined' in map));
	assert.ok('Brazil' in map);
});

test('buildSquadMap: returns empty object for empty squads array', () => {
	assert.deepStrictEqual(buildSquadMap([]), {});
});

// ── computeGroupsData ─────────────────────────────────────────────────────────

const MOCK_TEAMS_INFO = [
	{ name: 'Brazil', fifa_code: 'BRA', flag_icon: '🇧🇷' },
	{ name: 'Germany', fifa_code: 'GER', flag_icon: '🇩🇪' },
	{ name: 'France', fifa_code: 'FRA', flag_icon: '🇫🇷' },
	{ name: 'Argentina', fifa_code: 'ARG', flag_icon: '🇦🇷' }
];

const MOCK_GROUP_DEF = [{ name: 'Group A', teams: ['Brazil', 'Germany', 'France', 'Argentina'] }];

test('computeGroupsData: returns one group with correct name', () => {
	const result = computeGroupsData({
		groups: MOCK_GROUP_DEF,
		matches: [],
		teamsInfo: MOCK_TEAMS_INFO,
		squads: [],
		flagByCode: {},
		flagByName: {}
	});
	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].name, 'Group A');
	assert.strictEqual(result[0].teams.length, 4);
});

test('computeGroupsData: attaches flag and fifaCode from teamsInfo', () => {
	const result = computeGroupsData({
		groups: MOCK_GROUP_DEF,
		matches: [],
		teamsInfo: MOCK_TEAMS_INFO,
		squads: [],
		flagByCode: {},
		flagByName: {}
	});
	const brazil = result[0].teams.find((t) => t.name === 'Brazil');
	assert.strictEqual(brazil.flag, '🇧🇷');
	assert.strictEqual(brazil.fifaCode, 'BRA');
});

test('computeGroupsData: computes points and GD from match results', () => {
	const matches = [
		groupMatch('Brazil', 'Germany', [3, 1]),   // BRA W, GER L
		groupMatch('France', 'Argentina', [0, 0])  // draw
	];
	const result = computeGroupsData({
		groups: MOCK_GROUP_DEF,
		matches,
		teamsInfo: MOCK_TEAMS_INFO,
		squads: [],
		flagByCode: {},
		flagByName: {}
	});
	const brazil = result[0].teams.find((t) => t.name === 'Brazil');
	assert.strictEqual(brazil.points, 3);
	assert.strictEqual(brazil.gd, 2);
	assert.strictEqual(brazil.gf, 3);
});

test('computeGroupsData: sorts teams by points desc then gd desc', () => {
	const matches = [
		groupMatch('Brazil', 'Germany', [1, 0]),
		groupMatch('Brazil', 'France', [2, 0]),
		groupMatch('Germany', 'France', [1, 0])
	];
	const result = computeGroupsData({
		groups: MOCK_GROUP_DEF,
		matches,
		teamsInfo: MOCK_TEAMS_INFO,
		squads: [],
		flagByCode: {},
		flagByName: {}
	});
	const names = result[0].teams.map((t) => t.name);
	assert.strictEqual(names[0], 'Brazil');    // 6 pts
	assert.strictEqual(names[1], 'Germany');   // 3 pts
	assert.strictEqual(names[2], 'Argentina'); // 0 pts, 0 gd, alphabetically first
	assert.strictEqual(names[3], 'France');    // 0 pts, -2 gd
});

test('computeGroupsData: enriches players with club country flag', () => {
	const squads = [{
		name: 'Brazil',
		fifa_code: 'BRA',
		players: [{ name: 'Vinicius', number: 7, club: { name: 'Real Madrid', country: 'ESP' } }]
	}];
	const result = computeGroupsData({
		groups: [{ name: 'Group A', teams: ['Brazil'] }],
		matches: [],
		teamsInfo: [{ name: 'Brazil', fifa_code: 'BRA', flag_icon: '🇧🇷' }],
		squads,
		flagByCode: { ESP: '🇪🇸' },
		flagByName: {}
	});
	const player = result[0].teams[0].players[0];
	assert.strictEqual(player.club.flag, '🇪🇸');
});

test('computeGroupsData: sorts players by squad number', () => {
	const squads = [{
		name: 'Brazil',
		players: [
			{ name: 'Vinicius', number: 7 },
			{ name: 'Alisson', number: 1 },
			{ name: 'Rodrygo', number: 11 }
		]
	}];
	const result = computeGroupsData({
		groups: [{ name: 'Group A', teams: ['Brazil'] }],
		matches: [],
		teamsInfo: [{ name: 'Brazil', fifa_code: 'BRA', flag_icon: '🇧🇷' }],
		squads,
		flagByCode: {},
		flagByName: {}
	});
	const numbers = result[0].teams[0].players.map((p) => p.number);
	assert.deepStrictEqual(numbers, [1, 7, 11]);
});

test('computeGroupsData: falls back to fifa_code for squad lookup', () => {
	// squad indexed by code only, group uses full name
	const squads = [{ name: 'Brasil', fifa_code: 'BRA', players: [{ name: 'Vinicius', number: 7 }] }];
	const result = computeGroupsData({
		groups: [{ name: 'Group A', teams: ['Brazil'] }],
		matches: [],
		teamsInfo: [{ name: 'Brazil', fifa_code: 'BRA', flag_icon: '🇧🇷' }],
		squads,
		flagByCode: {},
		flagByName: {}
	});
	// 'Brazil' not in squad map, but 'BRA' is → should resolve via teamInfo.fifa_code
	assert.strictEqual(result[0].teams[0].players.length, 1);
});

// ── rankThirdPlace ────────────────────────────────────────────────────────────

function makeTeam(name, points, gd = 0, gf = 0) {
	return { name, flag: '', fifaCode: name.slice(0, 3).toUpperCase(), w: 0, d: 0, l: 0, gf, ga: gf - gd, points, gd };
}

test('rankThirdPlace: sorts by points desc, then gd desc, then gf desc, then name asc', () => {
	const groupsData = [
		{ name: 'Group A', teams: [makeTeam('A1', 9), makeTeam('A2', 6), makeTeam('A3', 4, 2, 5)] },
		{ name: 'Group B', teams: [makeTeam('B1', 9), makeTeam('B2', 6), makeTeam('B3', 4, 2, 3)] },
		{ name: 'Group C', teams: [makeTeam('C1', 9), makeTeam('C2', 6), makeTeam('C3', 4, 1, 5)] },
	];
	const result = rankThirdPlace(groupsData);
	assert.strictEqual(result[0].name, 'A3');
	assert.strictEqual(result[1].name, 'B3');
	assert.strictEqual(result[2].name, 'C3');
});

test('rankThirdPlace: caps at 8 teams even with more groups', () => {
	const groupsData = 'ABCDEFGHIJ'.split('').map((l) => ({
		name: `Group ${l}`,
		teams: [`${l}1`, `${l}2`, `${l}3`, `${l}4`].map((n, i) => makeTeam(n, 3 - i, 3 - i))
	}));
	assert.strictEqual(rankThirdPlace(groupsData).length, 8);
});

test('rankThirdPlace: skips groups with fewer than 3 teams', () => {
	const groupsData = [
		{ name: 'Group A', teams: [makeTeam('A1', 9), makeTeam('A2', 6)] },
		{ name: 'Group B', teams: [makeTeam('B1', 9), makeTeam('B2', 6), makeTeam('B3', 3)] },
	];
	const result = rankThirdPlace(groupsData);
	assert.strictEqual(result.length, 1);
	assert.strictEqual(result[0].name, 'B3');
});

test('rankThirdPlace: name tiebreaker sorts alphabetically', () => {
	const groupsData = [
		{ name: 'Group A', teams: [makeTeam('A1', 9), makeTeam('A2', 6), makeTeam('Zebra', 1, 0, 1)] },
		{ name: 'Group B', teams: [makeTeam('B1', 9), makeTeam('B2', 6), makeTeam('Alpha', 1, 0, 1)] },
	];
	const result = rankThirdPlace(groupsData);
	assert.strictEqual(result[0].name, 'Alpha');
	assert.strictEqual(result[1].name, 'Zebra');
});
