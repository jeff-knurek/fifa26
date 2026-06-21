import test from 'node:test';
import assert from 'node:assert';
import { computeTopScorers } from './scorer-utils.js';

test('computeTopScorers counts goals across matches correctly', () => {
	const rawMatches = [
		{
			team1: 'England',
			team2: 'South Africa',
			goals1: [
				{ name: 'Harry Kane', minute: 12, penalty: true },
				{ name: 'Harry Kane', minute: 42 },
				{ name: 'Jude Bellingham', minute: 47 }
			],
			goals2: []
		},
		{
			team1: 'South Korea',
			team2: 'England',
			goals1: [
				{ name: 'Hwang In-Beom', minute: 67 },
				{ name: 'Oh Hyeon-Gyu', minute: 80 }
			],
			goals2: [{ name: 'Jude Bellingham', minute: 59 }]
		}
	];

	const mockTeams = [
		{ name: 'England', flag_icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', fifa_code: 'ENG' },
		{ name: 'South Korea', flag_icon: '🇰🇷', fifa_code: 'KOR' },
		{ name: 'South Africa', flag_icon: '🇿🇦', fifa_code: 'RSA' }
	];

	const scorers = computeTopScorers(rawMatches, mockTeams);

	assert.strictEqual(scorers.length, 4);

	// Sorted by goals desc, then name asc
	assert.strictEqual(scorers[0].name, 'Harry Kane');
	assert.strictEqual(scorers[0].goals, 2);
	assert.strictEqual(scorers[0].team, 'England');
	assert.strictEqual(scorers[0].teamCode, 'ENG');
	assert.strictEqual(scorers[0].teamFlag, '🏴󠁧󠁢󠁥󠁮󠁧󠁿');

	assert.strictEqual(scorers[1].name, 'Jude Bellingham');
	assert.strictEqual(scorers[1].goals, 2);
	assert.strictEqual(scorers[1].teamCode, 'ENG');

	assert.strictEqual(scorers[2].name, 'Hwang In-Beom');
	assert.strictEqual(scorers[2].goals, 1);
	assert.strictEqual(scorers[2].teamCode, 'KOR');

	assert.strictEqual(scorers[3].name, 'Oh Hyeon-Gyu');
	assert.strictEqual(scorers[3].goals, 1);
	assert.strictEqual(scorers[3].teamCode, 'KOR');
});

test('computeTopScorers resolves team via name_normalised', () => {
	const rawMatches = [
		{
			team1: 'United States',
			team2: 'Mexico',
			goals1: [{ name: 'Christian Pulisic', minute: 23 }],
			goals2: []
		}
	];
	const mockTeams = [
		{ name: 'USA', name_normalised: 'United States', flag_icon: '🇺🇸', fifa_code: 'USA' },
		{ name: 'Mexico', flag_icon: '🇲🇽', fifa_code: 'MEX' }
	];

	const scorers = computeTopScorers(rawMatches, mockTeams);

	assert.strictEqual(scorers.length, 1);
	assert.strictEqual(scorers[0].name, 'Christian Pulisic');
	assert.strictEqual(scorers[0].teamCode, 'USA');
	assert.strictEqual(scorers[0].teamFlag, '🇺🇸');
});

test('computeTopScorers handles matches with no goals arrays', () => {
	const rawMatches = [{ team1: 'Brazil', team2: 'Germany' }];
	const mockTeams = [
		{ name: 'Brazil', flag_icon: '🇧🇷', fifa_code: 'BRA' },
		{ name: 'Germany', flag_icon: '🇩🇪', fifa_code: 'GER' }
	];

	const scorers = computeTopScorers(rawMatches, mockTeams);
	assert.strictEqual(scorers.length, 0);
});

test('computeTopScorers falls back gracefully when team not in teamsInfo', () => {
	const rawMatches = [
		{
			team1: 'Unknown FC',
			team2: 'Brazil',
			goals1: [{ name: 'Mystery Player', minute: 45 }],
			goals2: []
		}
	];
	const mockTeams = [{ name: 'Brazil', flag_icon: '🇧🇷', fifa_code: 'BRA' }];

	const scorers = computeTopScorers(rawMatches, mockTeams);
	assert.strictEqual(scorers.length, 1);
	assert.strictEqual(scorers[0].name, 'Mystery Player');
	assert.strictEqual(scorers[0].team, 'Unknown FC');
	assert.strictEqual(scorers[0].teamFlag, '');
	assert.strictEqual(scorers[0].teamCode, '');
	assert.strictEqual(scorers[0].goals, 1);
});

test('skip counting own goals', () => {
	const rawMatches = [
		{
			team1: 'United States',
			team2: 'Mexico',
			goals1: [{"name": "Cameron Burgess", "minute": "11", "owngoal": true},
				{"name": "Alex Freeman", "minute": "43"}
			],
			goals2: []
		}
	];
	const mockTeams = [
		{ name: 'USA', name_normalised: 'United States', flag_icon: '🇺🇸', fifa_code: 'USA' },
		{ name: 'Mexico', flag_icon: '🇲🇽', fifa_code: 'MEX' }
	];

	const scorers = computeTopScorers(rawMatches, mockTeams);

	assert.strictEqual(scorers.length, 1);
	assert.strictEqual(scorers[0].name, 'Alex Freeman');
	assert.strictEqual(scorers[0].teamCode, 'USA');
	assert.strictEqual(scorers[0].teamFlag, '🇺🇸');
});
