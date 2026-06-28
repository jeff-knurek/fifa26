<script>
  /** @type {{ scorers: { name: string, team: string, teamFlag: string, teamCode: string, goals: number }[] }} */
  let { scorers } = $props();

  const totalGroups = $derived(scorers.length > 0 ? scorers[scorers.length - 1].goalGroup + 1 : 1);

  /** Returns an inline style string for the goals badge based on the scorer's goal-group. */
  function badgeStyle(goalGroup) {
    const t = goalGroup / Math.max(totalGroups - 1, 1);
    // Spread across up to 12 perceptually distinct hues: gold (45°) → violet (285°)
    const hue = Math.round(45 + t * 240);
    const sat = Math.round(85 - t * 20);
    const lit = Math.round(48 + t * 12);
    return `color: hsl(${hue}, ${sat}%, ${lit}%);`;
  }
</script>

<div class="scorers-wrap">
  {#if scorers.length === 0}
    <div class="scorers-empty">
      <p>No goals scored yet. Check back once matches begin.</p>
    </div>
  {:else}
    <table class="scorers-table">
      <thead>
        <tr>
          <th class="scorers-th-rank">#</th>
          <th class="scorers-th-player">Player</th>
          <th class="scorers-th-team">Team</th>
          <th class="scorers-th-goals">Goals</th>
        </tr>
      </thead>
      <tbody>
        {#each scorers as scorer, i}
          <tr class="scorers-row">
            <td class="scorers-td-rank {i < 3 ? 'rank-top' : ''}">{i + 1}</td>
            <td class="scorers-td-player">{scorer.name}</td>
            <td class="scorers-td-team">
              {#if scorer.teamFlag}
                <span class="scorers-flag">{scorer.teamFlag}</span>
              {/if}
              <span class="scorers-code">{scorer.teamCode || scorer.team}</span>
            </td>
            <td class="scorers-td-goals">
              <span class="goals-badge" style={badgeStyle(scorer.goalGroup)}>{scorer.goals}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
