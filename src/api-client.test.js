import test from 'node:test';
import assert from 'node:assert';
import { fetchAllMatches } from './api-client.js';

test('fetchAllMatches loads local json data successfully', async () => {
    const matches = await fetchAllMatches();

    assert.ok(Array.isArray(matches), 'Matches should be an array');
    assert.ok(matches.length > 0, 'Should load matches from JSON files');

    const firstMatch = matches[0];
    assert.ok(firstMatch.round, 'Match should have a round property');
    assert.ok(firstMatch.date, 'Match should have a date property');
});
