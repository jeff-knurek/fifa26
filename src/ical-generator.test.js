import test from 'node:test';
import assert from 'node:assert';
import { generateIcal } from './ical-generator.js';

test('generateIcal creates a valid iCalendar string', () => {
    const events = [
        {
            uid: 'match-1@fifa26.calendar',
            start: '2026-06-11T18:00:00.000Z',
            end: '2026-06-11T19:30:00.000Z',
            title: 'Mexico vs South Africa',
            description: 'Matchday 1 Group A',
            location: 'Mexico City'
        }
    ];

    const icsString = generateIcal(events);

    assert.match(icsString, /BEGIN:VCALENDAR/);
    assert.match(icsString, /UID:match-1@fifa26.calendar/);
    assert.match(icsString, /SUMMARY:Mexico vs South Africa/);
    assert.match(icsString, /DESCRIPTION:Matchday 1 Group A/);
    assert.match(icsString, /LOCATION:Mexico City/);
    assert.match(icsString, /X-WR-CALNAME:FIFA World Cup 2026/); // name string is encoded here
    assert.match(icsString, /END:VCALENDAR/);
});
