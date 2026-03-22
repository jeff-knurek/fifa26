import test from 'node:test';
import assert from 'node:assert';
import { transformMatches } from './match-transformer.js';

test('transformMatches converts raw matches to simplified events', () => {
    const rawMatches = [
        {
            round: "Matchday 1",
            date: "2026-06-21",
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
        },
        {
            round: "Matchday 3",
            date: "2026-06-15",
            team1: "Mexico",
            team2: "South Africa",
            group: "Group A",
            score: { "ft": [0, 2], "ht": [0, 2] },
            goals1: [],
            goals2: [
                { "name": "Player One", "minute": 16, "penalty": true },
                { "name": "Player One", "minute": 31 }
            ],
            ground: { name: ["Mexico City"] }
        },
        {
            round: "Matchday 4",
            date: "2026-06-18",
            team1: "Canada",
            team2: "USA",
            score: { "ft": [0, 2], "ht": [0, 0] },
            goals1: [],
            goals2: [
                { "name": "One Player", "minute": 84 },
                { "name": "Two Player", "minute": 90, "offset": 9 }
            ],
            group: "Group C",
            ground: { name: ["Toronto"] }
        }
    ];
    // Mock today to be 2026-06-19
    const originalDate = Date;
    global.Date = class extends Date {
        constructor(dateString) {
            if (dateString) {
                super(dateString);
            } else {
                super('2026-06-19');
            }
        }
    };

    const events = transformMatches(rawMatches);

    assert.strictEqual(events.length, 5);

    // Test first match (with group and ground)
    assert.strictEqual(events[0].id, 1);
    assert.strictEqual(events[0].uid, 'match-1@fifa26.calendar');
    assert.strictEqual(events[0].title, '🇲🇽 MEX vs 🇿🇦 RSA');
    assert.strictEqual(events[0].start, '2026-06-21T18:00:00.000Z');
    assert.strictEqual(events[0].end, '2026-06-21T19:30:00.000Z');
    assert.strictEqual(events[0].location, 'Mexico City');
    assert.strictEqual(events[0].description, 'Group A\nMexico vs South Africa\nMatchday 1');

    // Test second match (finals, no group)
    assert.strictEqual(events[1].title, '2A vs 2B');
    assert.strictEqual(events[1].description, 'Round of 32\n2A vs 2B');

    // Test third match (missing some fields)
    assert.strictEqual(events[2].title, 'TBD vs TBD');
    assert.strictEqual(events[2].location, 'TBD');
    assert.strictEqual(events[2].description, 'Quarter-final\nTBD vs TBD');

    // Test that the title and description of match 3 includes the score and goals
    assert.strictEqual(events[3].title, '🇲🇽 MEX vs 🇿🇦 RSA 0-2');
    assert.strictEqual(events[3].description, 'Group A\nMexico vs South Africa\nMatchday 3\nScore: 0-2\nPlayer One (16min) (P)\nPlayer One (31min)');

    // Test that since today == 2026-06-19, there are no scores in the title or description of match 4
    assert.strictEqual(events[4].title, '🇨🇦 CAN vs 🇺🇸 USA');
    assert.strictEqual(events[4].description, 'Group C\nCanada vs USA\nMatchday 4\nScore: PENDING');
});
