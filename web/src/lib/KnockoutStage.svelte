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
  const mainRounds = $derived(
    knockoutRounds.filter(r => r.name !== 'Match for third place' && r.matches.length > 0)
  );

  function fmtDate(s) {
    return new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC'
    });
  }

  function fmtCode(rawCode) {
    if (rawCode.match(/^W(\d+)$/)) return `Win #${rawCode.slice(1)}`;
    if (rawCode.match(/^L(\d+)$/)) return `Loser #${rawCode.slice(1)}`;
    if (rawCode.startsWith('3')) return 'Best 3rd';
    return rawCode;
  }

  /** @param {any} match */
  function winner(match) {
    if (!match.score) return 0;
    const [g1, g2] = match.score;
    if (g1 > g2) return 1;
    if (g2 > g1) return 2;
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

<div class="bracket-outer">
  <div class="bracket">
    {#each mainRounds as round, ri}
      {@const isLast = ri === mainRounds.length - 1}
      {@const showFull = round.matches.length > 8}
      <div class="round" class:has-connector={!isLast} class:compact={!showFull}>
        <div class="round-label">{ROUND_LABELS[round.name] ?? round.name}</div>
        <ul class="round-matches">
          {#each round.matches as match (match.num)}
            {@const w = winner(match)}
            <li class="match-slot">
              <div class="match-card" class:played={!!match.score}>

                {@render teamRow(match.team1, w === 1, w === 2 && !!match.score, match.score?.[0] ?? null)}

                {#if !match.score}
                  <div class="vs">vs</div>
                {/if}

                {@render teamRow(match.team2, w === 2, w === 1 && !!match.score, match.score?.[1] ?? null)}

                <div class="meta">
                  <span class="meta-date">{fmtDate(match.date)}</span>
                  {#if showFull}
                    <span class="meta-venue">{match.ground}</span>
                  {/if}
                </div>

              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  {#if thirdPlace?.matches.length}
    {@const match = thirdPlace.matches[0]}
    {@const w = winner(match)}
    <div class="third-wrap">
      <div class="third-label">3rd Place</div>
      <div class="match-card" class:played={!!match.score}>

        {@render teamRow(match.team1, w === 1, w === 2 && !!match.score, match.score?.[0] ?? null)}

        {#if !match.score}
          <div class="vs">vs</div>
        {/if}

        {@render teamRow(match.team2, w === 2, w === 1 && !!match.score, match.score?.[1] ?? null)}

        <div class="meta">
          <span class="meta-date">{fmtDate(match.date)}</span>
          <span class="meta-venue">{match.ground}</span>
        </div>

      </div>
    </div>
  {/if}
</div>

<style>
  /* ── Outer wrapper: horizontal scroll ── */
  .bracket-outer {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  /* ── Bracket row ── */
  .bracket {
    display: flex;
    align-items: stretch;
    gap: var(--conn-gap, 32px);
    overflow-x: auto;
    padding-bottom: 8px;
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
    Connector lines on source rounds (has-connector):

    ::before — horizontal stub going right across the gap
    ::after  — vertical bracket arm:
               odd slots go DOWN from center (connect to slot below)
               even slots go UP from center  (connect to slot above)

    Together, each pair of slots forms a ⌐ and L that meet
    at the boundary between them = center of the next round's slot.
  */
  .round.has-connector .match-slot::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 100%;
    width: var(--conn-gap, 32px);
    height: 2px;
    background: var(--border-accent, rgba(255,255,255,0.15));
    transform: translateY(-1px);
  }

  .round.has-connector .match-slot:nth-child(odd)::after {
    content: '';
    position: absolute;
    top: 50%;
    left: calc(100% + var(--conn-gap, 32px));
    width: 2px;
    height: 50%;
    background: var(--border-accent, rgba(255,255,255,0.15));
  }

  .round.has-connector .match-slot:nth-child(even)::after {
    content: '';
    position: absolute;
    bottom: 50%;
    left: calc(100% + var(--conn-gap, 32px));
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
    transition: border-color var(--transition);
  }
  .match-card:hover {
    border-color: var(--border-accent);
  }
  .match-card.played {
    border-color: rgba(255,255,255,0.08);
  }

  /* Compact rounds get narrower cards */
  .round.compact .match-card {
    min-width: 150px;
    padding: 8px 10px;
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
  .round.compact .flag {
    font-size: 1rem;
    width: 20px;
  }

  .name {
    flex: 1;
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
  .round.compact .name {
    font-size: 0.75rem;
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

  /* ── 3rd place (detached) ── */
  .third-wrap {
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 4px;
  }
  .third-label {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 0.95rem;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
  }
  .third-wrap .match-card {
    min-width: 220px;
  }
</style>
