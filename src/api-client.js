export async function fetchAllMatches() {
    const response = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.json');
    if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.statusText}`);
    }
    const worldcup = await response.json();

    return worldcup.matches || [];
}

export async function fetchTeams() {
    const response = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.teams_meta.json');
    if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }
    return await response.json();
}
