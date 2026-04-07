import test from 'node:test';
import assert from 'node:assert';
import { fetchAllMatches, fetchTeams } from './api-client.js';

test('fetchAllMatches loads remote json data successfully', async () => {

    const matches = await fetchAllMatches();

    assert.ok(Array.isArray(matches), 'Matches should be an array');
    assert.ok(matches.length > 0, 'Should load matches from JSON files');

    const firstMatch = matches[0];
    assert.ok(firstMatch.round, 'Match should have a round property');
    assert.ok(firstMatch.date, 'Match should have a date property');
});

test('fetchTeams loads remote team metadata successfully', async () => {
    const teams = await fetchTeams();

    assert.ok(Array.isArray(teams), 'Teams should be an array');
    assert.ok(teams.length > 0, 'Should load teams from remote JSON');

    const firstTeam = teams[0];
    assert.ok(firstTeam.name, 'Team should have a name');
    assert.ok(firstTeam.fifa_code, 'Team should have a fifa_code');
});

