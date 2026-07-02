<script>
  /** @type {{ knockoutRounds: Array<{name:string, matches:any[]}> }} */
  let { knockoutRounds } = $props();
  const ROUND_LABELS = {
    'Round of 32': 'R32',
    'Round of 16': 'Round of 16',
    'Quarter-final': 'Quarterfinals',
    'Semi-final': 'Semifinals',
    'Final': 'Final'
  };

  const thirdPlace = $derived(knockoutRounds.find(r => r.name === 'Match for third place'));
  const finalRound = $derived(knockoutRounds.find(r => r.name === 'Final'));
  const mainRounds = $derived(
    knockoutRounds.filter(r => r.name !== 'Match for third place' && r.name !== 'Final' && r.matches.length > 0)
  );

  // Split each round's reordered matches: first half → left bracket, second half → right bracket
  const splitRounds = $derived(
    mainRounds.map(round => {
      const half = Math.ceil(round.matches.length / 2);
      return { name: round.name, left: round.matches.slice(0, half), right: round.matches.slice(half) };
    })
  );
  // Left: R32 → R16 → QF → SF (inner-to-outer reads right)
  const leftRounds = $derived(splitRounds.map(r => ({ name: r.name, matches: r.left })));
  // Right: SF → QF → R16 → R32 (inner-to-outer reads left, so SF is closest to Final)
  const rightRounds = $derived([...splitRounds].reverse().map(r => ({ name: r.name, matches: r.right })));

  /** @type {Set<number>} */
  let expandedMatches = $state(new Set());

  function toggleExpanded(matchNum) {
    const next = new Set(expandedMatches);
    if (next.has(matchNum)) next.delete(matchNum);
    else next.add(matchNum);
    expandedMatches = next;
  }

  function fmtDate(s) {
    return new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC'
    });
  }

  function fmtCode(rawCode) {
    if (rawCode.match(/^W(\d+)$/)) return `Win #${rawCode.slice(1)}`;
    if (rawCode.match(/^L(\d+)$/)) return `Loser #${rawCode.slice(1)}`;
    if (rawCode.startsWith('3')) return rawCode;
    return rawCode;
  }

  function teamCode(team) {
    return team.resolved ? team.name : fmtCode(team.name);
  }

  /** @param {any} match */
  function winner(match) {
    if (!match.score) return 0;
    const [g1, g2] = match.score;
    if (g1 > g2) return 1;
    if (g2 > g1) return 2;
    if (match.penalties) {
      const [p1, p2] = match.penalties;
      if (p1 > p2) return 1;
      if (p2 > p1) return 2;
    }
    return 0;
  }
</script>

{#snippet teamRow(team, isWin, isLose, goals)}
  <div class="team-row" class:win={isWin} class:lose={isLose}>
    <span class="flag">{team.flag || '🏟'}</span>
    <span class="name" class:tbd={!team.resolved} class:guess={team.resolved && !team.confirmed}>
      {#if team.resolved && !team.confirmed}
        {team.code} ({team.name})
      {:else}
        {team.resolved ? team.name : fmtCode(team.name)}
      {/if}
    </span>
    {#if goals !== null}
      <span class="score" class:score-win={isWin}>{goals}</span>
    {/if}
  </div>
{/snippet}

{#snippet teamRowCompact(team, isWin, isLose, goals)}
  <div class="team-row" class:win={isWin} class:lose={isLose}>
    <span class="flag">{team.flag || '🏟'}</span>
    <span class="compact-code">{teamCode(team)}</span>
    <span class="score" class:score-win={isWin}>{goals}</span>
  </div>
{/snippet}

{#snippet matchCardContent(match, w, isCompact)}
  <span class="match-num">#{match.num}</span>

  {#if isCompact}
    {@render teamRowCompact(match.team1, w === 1, w === 2, match.score[0])}
    {@render teamRowCompact(match.team2, w === 2, w === 1, match.score[1])}
  {:else}
    {@render teamRow(match.team1, w === 1, w === 2 && !!match.score, match.score?.[0] ?? null)}
    {#if !match.score}
      <div class="vs">vs</div>
    {/if}
    {@render teamRow(match.team2, w === 2, w === 1 && !!match.score, match.score?.[1] ?? null)}
    {#if match.penalties}
      {@const penWinner = w === 1 ? match.team1.name : match.team2.name}
      <div class="pen-row">Penalties: {match.penalties[0]}:{match.penalties[1]} · {penWinner}</div>
    {/if}
    <div class="meta">
      <span class="meta-date">{fmtDate(match.date)}</span>
      <span class="meta-venue">{match.ground}</span>
    </div>
  {/if}
{/snippet}

{#snippet matchCard(match)}
  {@const w = winner(match)}
  {@const isCompact = !!match.score && !expandedMatches.has(match.num)}
  {#if match.score}
    <button
      type="button"
      class="match-card played"
      class:compact-view={isCompact}
      onclick={() => toggleExpanded(match.num)}
    >
      {@render matchCardContent(match, w, isCompact)}
    </button>
  {:else}
    <div class="match-card">
      {@render matchCardContent(match, w, isCompact)}
    </div>
  {/if}
{/snippet}

<div class="bracket-outer">
  <div class="bracket-split">

    <!-- Left half: R32 → R16 → QF → SF -->
    <div class="bracket-half bracket-left">
      {#each leftRounds as round, ri}
        <div class="round" class:has-connector={ri < leftRounds.length - 1}>
          <div class="round-label">{ROUND_LABELS[round.name] ?? round.name}</div>
          <ul class="round-matches">
            {#each round.matches as match (match.num)}
              <li class="match-slot">
                {@render matchCard(match)}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>

    <!-- Center: Final + 3rd Place -->
    <div class="final-col">
      <div class="round-label">Final</div>
      {#if finalRound?.matches[0]}
        {@render matchCard(finalRound.matches[0])}
      {/if}
      {#if thirdPlace?.matches.length}
        <div class="third-label">3rd Place</div>
        {@render matchCard(thirdPlace.matches[0])}
      {/if}
    </div>

    <!-- Right half: SF → QF → R16 → R32 (SF closest to center) -->
    <div class="bracket-half bracket-right">
      {#each rightRounds as round, ri}
        <div class="round" class:has-connector={ri > 0}>
          <div class="round-label">{ROUND_LABELS[round.name] ?? round.name}</div>
          <ul class="round-matches">
            {#each round.matches as match (match.num)}
              <li class="match-slot">
                {@render matchCard(match)}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>

  </div>


</div>

<style>
  /* ── Outer wrapper ── */
  .bracket-outer {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* ── Split bracket row ── */
  .bracket-split {
    display: flex;
    align-items: stretch;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  /* ── Each half is a flex row of rounds ── */
  .bracket-half {
    display: flex;
    align-items: stretch;
    gap: var(--conn-gap, 32px);
    flex-shrink: 0;
  }

  /* ── Final column centered between the two halves ── */
  .final-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 calc(var(--conn-gap, 32px) * 1.5);
    flex-shrink: 0;
  }
  .final-col .round-label {
    text-align: center;
  }

  /* ── Round column ── */
  .round {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .round-label {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 0.95rem;
    letter-spacing: 0.08em;
    color: var(--gold);
    text-align: center;
    padding: 0 0 10px;
    white-space: nowrap;
  }

  /* ── Match list ── */
  .round-matches {
    list-style: none;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  /* ── Match slot: distributes equally so QF slots = 2× R16 height ── */
  .match-slot {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 5px 0;
    position: relative;
  }

  /*
    LEFT bracket connectors (stubs go RIGHT):
    ::before — horizontal stub going right across the gap
    ::after  — vertical bracket arm connecting pairs to next round's slot
  */
  .bracket-left .round.has-connector .match-slot::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 100%;
    width: var(--conn-gap, 32px);
    height: 2px;
    background: var(--border-accent, rgba(255,255,255,0.15));
    transform: translateY(-1px);
  }

  .bracket-left .round.has-connector .match-slot:nth-child(odd)::after {
    content: '';
    position: absolute;
    top: 50%;
    left: calc(100% + var(--conn-gap, 32px));
    width: 2px;
    height: 50%;
    background: var(--border-accent, rgba(255,255,255,0.15));
  }

  .bracket-left .round.has-connector .match-slot:nth-child(even)::after {
    content: '';
    position: absolute;
    bottom: 50%;
    left: calc(100% + var(--conn-gap, 32px));
    width: 2px;
    height: 50%;
    background: var(--border-accent, rgba(255,255,255,0.15));
  }

  /*
    RIGHT bracket connectors (stubs go LEFT — mirrored):
    ::before — horizontal stub going left across the gap
    ::after  — vertical bracket arm on the left side
  */
  .bracket-right .round.has-connector .match-slot::before {
    content: '';
    position: absolute;
    top: 50%;
    right: 100%;
    width: var(--conn-gap, 32px);
    height: 2px;
    background: var(--border-accent, rgba(255,255,255,0.15));
    transform: translateY(-1px);
  }

  .bracket-right .round.has-connector .match-slot:nth-child(odd)::after {
    content: '';
    position: absolute;
    top: 50%;
    right: calc(100% + var(--conn-gap, 32px));
    width: 2px;
    height: 50%;
    background: var(--border-accent, rgba(255,255,255,0.15));
  }

  .bracket-right .round.has-connector .match-slot:nth-child(even)::after {
    content: '';
    position: absolute;
    bottom: 50%;
    right: calc(100% + var(--conn-gap, 32px));
    width: 2px;
    height: 50%;
    background: var(--border-accent, rgba(255,255,255,0.15));
  }

  /* ── Match card ── */
  .match-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 190px;
    position: relative;
    transition: border-color var(--transition);
  }
  button.match-card {
    appearance: none;
    font: inherit;
    text-align: left;
    width: 100%;
    cursor: default;
  }
  .match-card:hover {
    border-color: var(--border-accent);
  }
  .match-card.played {
    border-color: rgba(255,255,255,0.08);
  }
  .match-card.compact-view {
    min-width: 140px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .match-num {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  /* ── Team row ── */
  .team-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px;
    border-radius: var(--radius-sm);
  }
  .team-row.win {
    background: rgba(245, 197, 24, 0.07);
  }
  .team-row.lose {
    opacity: 0.45;
  }

  .flag {
    font-size: 1.2rem;
    line-height: 1;
    flex-shrink: 0;
    width: 24px;
    text-align: center;
  }
  .compact-view .flag {
    font-size: 1rem;
    width: 20px;
  }

  .name {
    flex: 0.8;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name.tbd {
    color: var(--text-muted);
    font-style: italic;
    font-weight: 400;
    font-size: 0.72rem;
  }
  .name.guess {
    color: #8a8a8a;
  }

  .compact-code {
    flex: 0.8;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.04em;
  }

  .score {
    font-size: 1rem;
    font-weight: 800;
    min-width: 16px;
    text-align: right;
    flex-shrink: 0;
    color: var(--text-muted);
  }
  .score.score-win {
    color: var(--gold);
  }

  /* ── Penalties row ── */
  .pen-row {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.04em;
    padding: 2px 4px;
    text-align: center;
  }

  /* ── vs separator ── */
  .vs {
    text-align: center;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    text-transform: uppercase;
    padding: 1px 0;
  }

  /* ── Meta ── */
  .meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin-top: 5px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }
  .meta-date {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.03em;
  }
  .meta-venue {
    font-size: 0.64rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── 3rd place ── */
  .third-label {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 0.95rem;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    margin-top: 20px;
    text-align: center;
  }
</style>
