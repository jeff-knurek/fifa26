import fs from 'fs/promises';
import path from 'path';

export async function fetchAllMatches() {
    const worldcupData = await fs.readFile(path.join(process.cwd(), 'worldcup.json'), 'utf8');
    const worldcupFinalsData = await fs.readFile(path.join(process.cwd(), 'worldcup_finals.json'), 'utf8');

    const worldcup = JSON.parse(worldcupData);
    const worldcupFinals = JSON.parse(worldcupFinalsData);

    return [...(worldcup.matches || []), ...(worldcupFinals.matches || [])];
}
