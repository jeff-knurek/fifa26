import ical from 'ical-generator';

export function generateIcal(events) {
    const cal = ical({ name: 'FIFA World Cup 2026' });

    for (const event of events) {
        cal.createEvent({
            id: event.uid,
            start: new Date(event.start),
            end: new Date(event.end),
            summary: event.title,
            description: event.description,
            location: event.location,
        });
    }

    return cal.toString();
}
