import test from 'node:test';
import assert from 'node:assert';
import { transformMatches } from './match-transformer.js';

test('transformMatches converts raw matches to simplified events', () => {
    const rawMatches = [
        {
            round: "Matchday 1",
            date: "2026-06-11",
            team1: "Mexico",
            team2: "South Africa",
            group: "Group A",
            ground: { name: ["Mexico City"] }
        },
        {
            round: "Round of 32",
            date: "2026-06-28",
            team1: "2A",
            team2: "2B",
            ground: { name: ["Los Angeles"] }
        },
        {
            round: "Quarter-final",
            date: "2026-07-09"
            // testing missing location & teams
        }
    ];

    const events = transformMatches(rawMatches);

    assert.strictEqual(events.length, 3);

    // Test first match (with group and ground)
    assert.strictEqual(events[0].id, 1);
    assert.strictEqual(events[0].uid, 'match-1@fifa26.calendar');
    assert.strictEqual(events[0].title, 'Mexico vs South Africa');
    assert.strictEqual(events[0].start, '2026-06-11T18:00:00.000Z');
    assert.strictEqual(events[0].end, '2026-06-11T19:30:00.000Z');
    assert.strictEqual(events[0].location, 'Mexico City');
    assert.strictEqual(events[0].description, 'Matchday 1 Group A');

    // Test second match (finals, no group)
    assert.strictEqual(events[1].title, '2A vs 2B');
    assert.strictEqual(events[1].description, 'Round of 32');

    // Test third match (missing some fields)
    assert.strictEqual(events[2].title, 'TBD vs TBD');
    assert.strictEqual(events[2].location, 'TBD');
    assert.strictEqual(events[2].description, 'Quarter-final');
});
