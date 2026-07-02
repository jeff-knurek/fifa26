import test from 'node:test';
import assert from 'node:assert';
import { isCode, resolveTeam, reorderByBracket, computeKnockoutData } from './knockout-utils.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTeam(name, points, gd = 0, gf = 0) {
	return { name, flag: '', fifaCode: name.slice(0, 3).toUpperCase(), w: 0, d: 0, l: 0, gf, ga: gf - gd, points, gd };
}


function makeMatch(num, team1, team2, code1 = null, code2 = null) {
	// team1/team2 are already-resolved {name,flag} objects for reorderByBracket tests
	return {
		num,
		date: '2026-07-01',
		ground: 'Stadium',
		team1: { name: team1.name, flag: team1.flag, code: code1 },
		team2: { name: team2.name, flag: team2.flag, code: code2 },
		score: null
	};
}

// ── isCode ───────────────────────────────────────────────────────────────────

test('isCode: recognises W and L codes', () => {
	assert.strictEqual(isCode('W50'), true);
	assert.strictEqual(isCode('L99'), true);
	assert.strictEqual(isCode('W1'), true);
});

test('isCode: rejects plain team names and malformed strings', () => {
	assert.strictEqual(isCode('Germany'), false);
	assert.strictEqual(isCode('W'), false);    // no digits
	assert.strictEqual(isCode('3A'), false);   // 3rd-place slot code
	assert.strictEqual(isCode('w50'), false);  // lowercase
	assert.strictEqual(isCode(''), false);
});

// ── resolveTeam ──────────────────────────────────────────────────────────────

test('resolveTeam: plain name gets flag from flagByName', () => {
	const result = resolveTeam('Germany', { Germany: '🇩🇪' }, {}, {});
	assert.deepStrictEqual(result, { name: 'Germany', flag: '🇩🇪' });
});

test('resolveTeam: plain name with no flag entry returns empty string', () => {
	const result = resolveTeam('Germany', {}, {}, {});
	assert.deepStrictEqual(result, { name: 'Germany', flag: '' });
});

test('resolveTeam: W-code resolves to the match winner', () => {
	const winners = { 50: { name: 'Brazil', flag: '🇧🇷' } };
	const result = resolveTeam('W50', {}, winners, {});
	assert.deepStrictEqual(result, { name: 'Brazil', flag: '🇧🇷' });
});

test('resolveTeam: L-code resolves to the match loser', () => {
	const losers = { 50: { name: 'Argentina', flag: '🇦🇷' } };
	const result = resolveTeam('L50', {}, {}, losers);
	assert.deepStrictEqual(result, { name: 'Argentina', flag: '🇦🇷' });
});

test('resolveTeam: W-code returns null when referenced match not yet played', () => {
	const result = resolveTeam('W99', {}, {}, {});
	assert.strictEqual(result, null);
});

test('resolveTeam: L-code returns null when referenced match not yet played', () => {
	const result = resolveTeam('L99', {}, {}, {});
	assert.strictEqual(result, null);
});

// ── reorderByBracket ──────────────────────────────────────────────────────────

test('reorderByBracket: orders semis to match the feeding order of the final', () => {
	// Final (100) = W10 vs W11  →  semis should be ordered [10, 11]
	const semis = [
		makeMatch(11, { name: 'C', flag: '' }, { name: 'D', flag: '' }),
		makeMatch(10, { name: 'A', flag: '' }, { name: 'B', flag: '' })
	];
	const knockoutRounds = [
		{ name: 'Semi-final', matches: semis },
		{ name: 'Final', matches: [{ num: 100, team1: { code: 'W10' }, team2: { code: 'W11' }, score: null }] }
	];

	reorderByBracket(knockoutRounds);

	const ordered = knockoutRounds.find((r) => r.name === 'Semi-final').matches;
	assert.strictEqual(ordered[0].num, 10);
	assert.strictEqual(ordered[1].num, 11);
});

test('reorderByBracket: does nothing when there is no Final', () => {
	const rounds = [
		{ name: 'Semi-final', matches: [makeMatch(10, { name: 'A', flag: '' }, { name: 'B', flag: '' })] }
	];
	reorderByBracket(rounds); // should not throw
	assert.strictEqual(rounds[0].matches[0].num, 10);
});

test('reorderByBracket: handles a 4-team bracket (QF → SF → Final) correctly', () => {
	// QF: 10,11,12,13  SF: W10vsW11=20, W12vsW13=21  Final: W20vsW21=30
	const qfMatches = [
		makeMatch(13, { name: 'D1', flag: '' }, { name: 'D2', flag: '' }),
		makeMatch(10, { name: 'A1', flag: '' }, { name: 'A2', flag: '' }),
		makeMatch(12, { name: 'C1', flag: '' }, { name: 'C2', flag: '' }),
		makeMatch(11, { name: 'B1', flag: '' }, { name: 'B2', flag: '' })
	];
	const sfMatches = [
		makeMatch(21, { name: '', flag: '' }, { name: '', flag: '' }, 'W12', 'W13'),
		makeMatch(20, { name: '', flag: '' }, { name: '', flag: '' }, 'W10', 'W11')
	];
	const finalMatch = { num: 30, team1: { code: 'W20' }, team2: { code: 'W21' }, score: null };

	const rounds = [
		{ name: 'Quarter-final', matches: qfMatches },
		{ name: 'Semi-final', matches: sfMatches },
		{ name: 'Final', matches: [finalMatch] }
	];

	reorderByBracket(rounds);

	const sf = rounds.find((r) => r.name === 'Semi-final').matches;
	assert.strictEqual(sf[0].num, 20); // W20 is team1 of Final
	assert.strictEqual(sf[1].num, 21);

	const qf = rounds.find((r) => r.name === 'Quarter-final').matches;
	// SF 20 = W10 vs W11 → QF order: 10, 11, then 12, 13
	assert.strictEqual(qf[0].num, 10);
	assert.strictEqual(qf[1].num, 11);
	assert.strictEqual(qf[2].num, 12);
	assert.strictEqual(qf[3].num, 13);
});

// ── computeKnockoutData (integration) ────────────────────────────────────────

// ── computeKnockoutData — penalty shootouts ───────────────────────────────────

test('computeKnockoutData: penalty winner set when ft is tied', () => {
	const matches = [
		{ num: 10, round: 'Quarter-final', date: '2026-07-01', ground: 'X',
		  team1: 'Germany', team2: 'Paraguay',
		  score: { ft: [1, 1], et: [1, 1], p: [3, 4] } }
	];

	const { knockoutRounds } = computeKnockoutData({ matches, groupsData: [], flagByName: { Germany: '🇩🇪', Paraguay: '🇵🇾' } });

	const qf = knockoutRounds.find(r => r.name === 'Quarter-final');
	const m = qf.matches[0];
	assert.deepStrictEqual(m.score, [1, 1]);
	assert.deepStrictEqual(m.penalties, [3, 4]);
});

test('computeKnockoutData: team2 wins on penalties, propagates via W-code', () => {
	const matches = [
		{ num: 10, round: 'Semi-final', date: '2026-07-01', ground: 'X',
		  team1: 'Germany', team2: 'Paraguay',
		  score: { ft: [1, 1], et: [1, 1], p: [3, 4] } },
		{ num: 20, round: 'Final', date: '2026-07-10', ground: 'Z',
		  team1: 'W10', team2: 'Brazil' }
	];

	const flagByName = { Germany: '🇩🇪', Paraguay: '🇵🇾', Brazil: '🇧🇷' };
	const { knockoutRounds } = computeKnockoutData({ matches, groupsData: [], flagByName });

	const finalRound = knockoutRounds.find(r => r.name === 'Final');
	// W10 should resolve to Paraguay (penalty winner)
	assert.strictEqual(finalRound.matches[0].team1.name, 'Paraguay');
	assert.strictEqual(finalRound.matches[0].team1.flag, '🇵🇾');
});

test('computeKnockoutData: team1 wins on penalties, propagates via W-code', () => {
	const matches = [
		{ num: 10, round: 'Semi-final', date: '2026-07-01', ground: 'X',
		  team1: 'Germany', team2: 'Paraguay',
		  score: { ft: [1, 1], et: [1, 1], p: [4, 3] } },
		{ num: 20, round: 'Final', date: '2026-07-10', ground: 'Z',
		  team1: 'W10', team2: 'Brazil' }
	];

	const flagByName = { Germany: '🇩🇪', Paraguay: '🇵🇾', Brazil: '🇧🇷' };
	const { knockoutRounds } = computeKnockoutData({ matches, groupsData: [], flagByName });

	const finalRound = knockoutRounds.find(r => r.name === 'Final');
	assert.strictEqual(finalRound.matches[0].team1.name, 'Germany');
});

test('computeKnockoutData: L-code resolves to penalty loser', () => {
	const matches = [
		{ num: 10, round: 'Semi-final', date: '2026-07-01', ground: 'X',
		  team1: 'Germany', team2: 'Paraguay',
		  score: { ft: [1, 1], et: [1, 1], p: [3, 4] } },
		{ num: 30, round: 'Match for third place', date: '2026-07-12', ground: 'Z',
		  team1: 'L10', team2: 'Brazil' }
	];

	const flagByName = { Germany: '🇩🇪', Paraguay: '🇵🇾', Brazil: '🇧🇷' };
	const { knockoutRounds } = computeKnockoutData({ matches, groupsData: [], flagByName });

	const third = knockoutRounds.find(r => r.name === 'Match for third place');
	// L10 should resolve to Germany (penalty loser)
	assert.strictEqual(third.matches[0].team1.name, 'Germany');
});

test('computeKnockoutData: no penalties field when score decided in ft', () => {
	const matches = [
		{ num: 10, round: 'Quarter-final', date: '2026-07-01', ground: 'X',
		  team1: 'Germany', team2: 'Brazil',
		  score: { ft: [2, 1] } }
	];

	const { knockoutRounds } = computeKnockoutData({ matches, groupsData: [], flagByName: {} });

	const m = knockoutRounds.find(r => r.name === 'Quarter-final').matches[0];
	assert.strictEqual(m.penalties, null);
});

test('computeKnockoutData: smoke test — assembles rounds and propagates winners', () => {
	const groupsData = [{ name: 'Group A', teams: ['A1', 'A2', 'A3', 'A4'].map((n, i) => makeTeam(n, 3 - i)) }];
	const flagByName = { A1: '🇦', A2: '🇧' };

	const matches = [
		{ num: 10, round: 'Semi-final', date: '2026-07-01', ground: 'X', team1: 'A1', team2: 'A2', score: { ft: [2, 0] } },
		{ num: 11, round: 'Semi-final', date: '2026-07-02', ground: 'Y', team1: 'A3', team2: 'A4' },
		{ num: 20, round: 'Final', date: '2026-07-10', ground: 'Z', team1: 'W10', team2: 'W11' }
	];

	const { knockoutRounds } = computeKnockoutData({ matches, groupsData, flagByName });

	const finalRound = knockoutRounds.find((r) => r.name === 'Final');
	assert.strictEqual(finalRound.matches[0].team1.name, 'A1'); // W10 resolved
	assert.strictEqual(finalRound.matches[0].team1.flag, '🇦');
	assert.strictEqual(finalRound.matches[0].team2.resolved, false); // W11 unresolved
});
