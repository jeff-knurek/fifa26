import { put } from '@vercel/blob';

export async function uploadCalendar(icsString) {
    const blob = await put('fifa-worldcup-2026.ics', icsString, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'text/calendar',
    });

    return blob.url;
}
