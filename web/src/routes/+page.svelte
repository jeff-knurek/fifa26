<script>
  import { fly, slide } from "svelte/transition";

  /** @type {import('./$types').PageData} */
  let { data } = $props();

  const groups = $derived(data.groups);

  // Track which groups are expanded (all collapsed by default)
  let expandedGroups = $state(new Set());
  // Track which teams have their squad expanded
  let expandedTeams = $state(new Set());
  // Active group nav filter (null = show all)
  let activeGroupIdx = $state(null);

  function toggleGroup(idx) {
    if (expandedGroups.has(idx)) {
      expandedGroups.delete(idx);
    } else {
      expandedGroups.add(idx);
    }
    expandedGroups = new Set(expandedGroups);
  }

  function toggleTeam(key) {
    if (expandedTeams.has(key)) {
      expandedTeams.delete(key);
    } else {
      expandedTeams.add(key);
    }
    expandedTeams = new Set(expandedTeams);
  }

  function scrollToGroup(idx) {
    activeGroupIdx = activeGroupIdx === idx ? null : idx;
    if (activeGroupIdx !== null) {
      setTimeout(() => {
        document
          .getElementById(`group-${idx}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  const totalTeams = $derived(groups.reduce((s, g) => s + g.teams.length, 0));
  const totalPlayers = $derived(
    groups.reduce((s, g) => s + g.teams.reduce((ts, t) => ts + t.players.length, 0), 0),
  );

  function gdClass(gd) {
    if (gd > 0) return "gd-pos";
    if (gd < 0) return "gd-neg";
    return "gd-zero";
  }
  function gdStr(gd) {
    if (gd > 0) return `+${gd}`;
    return `${gd}`;
  }

  const visibleGroups = $derived(
    activeGroupIdx !== null
      ? [{ ...groups[activeGroupIdx], _idx: activeGroupIdx }]
      : groups.map((g, i) => ({ ...g, _idx: i })),
  );
</script>

<svelte:head>
  <title>FIFA World Cup 2026 — Squads & Groups</title>
  <meta
    name="description"
    content="FIFA World Cup 2026 group standings, squads, and player information for all 48 teams."
  />
</svelte:head>

<div class="site-wrap">
  <!-- ── Header ── -->
  <header class="site-header">
    <h1 class="header-title">FIFA World Cup 2026 Squads</h1>
    <div class="header-stats">
      <div class="header-stat">
        <div class="num">{groups.length}</div>
        <div class="lbl">Groups</div>
      </div>
      <div class="header-stat">
        <div class="num">{totalTeams}</div>
        <div class="lbl">Teams</div>
      </div>
      <div class="header-stat">
        <div class="num">{totalPlayers}</div>
        <div class="lbl">Players</div>
      </div>
    </div>
  </header>

  <!-- ── Group Navigation ── -->
  <nav class="group-nav" aria-label="Jump to group">
    <!-- Column 1: All -->
    <div class="group-nav-col">
      <button
        class="group-nav-btn {activeGroupIdx === null ? 'active' : ''}"
        onclick={() => {
          activeGroupIdx = null;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}>All</button
      >
    </div>
    <!-- Columns 2-4: 4 groups each -->
    {#each [0, 1, 2] as colIdx}
      <div class="group-nav-col">
        {#each groups.slice(colIdx * 4, colIdx * 4 + 4) as g, j}
          {@const i = colIdx * 4 + j}
          <button
            class="group-nav-btn {activeGroupIdx === i ? 'active' : ''}"
            onclick={() => scrollToGroup(i)}>{g.name}</button
          >
        {/each}
      </div>
    {/each}
  </nav>

  <!-- ── Groups ── -->
  <div class="groups-list">
    {#each visibleGroups as group (group._idx)}
      {@const gIdx = group._idx}
      {@const isGroupOpen = expandedGroups.has(gIdx)}
      <section
        class="group-block"
        id="group-{gIdx}"
        in:fly={{ y: 20, duration: 300, delay: 40 }}
      >
        <!-- Group Header (click to collapse/expand all teams) -->
        <div
          class="group-header"
          role="button"
          tabindex="0"
          onclick={() => toggleGroup(gIdx)}
          onkeydown={(e) => e.key === "Enter" && toggleGroup(gIdx)}
          aria-expanded={isGroupOpen}
        >
          <div class="group-header-left">
            <span class="group-letter">{group.name.split(" ")[1]}</span>
            <div>
              <div class="group-name">{group.name}</div>
              <div class="group-team-flags">
                {#each group.teams as t}
                  <span title={t.name}>{t.flag}</span>
                {/each}
              </div>
            </div>
          </div>
          <span class="group-chevron {isGroupOpen ? 'open' : ''}">▼</span>
        </div>

        <!-- Standings Table -->
        {#if isGroupOpen}
          <div class="standings-wrap" transition:slide={{ duration: 250 }}>
            <table class="standings-table">
              <thead>
                <tr>
                  <th class="standings-th-team" colspan="2">Team</th>
                  <th class="standings-th-num">W</th>
                  <th class="standings-th-num">D</th>
                  <th class="standings-th-num">L</th>
                  <th class="standings-th-num">GF:GA</th>
                  <th class="standings-th-num">GD</th>
                  <th class="standings-th-num standings-th-pts">Pts</th>
                  <th class="standings-th-squad"></th>
                </tr>
              </thead>
              <tbody>
                {#each group.teams as team, tIdx}
                  {@const teamKey = `${gIdx}-${tIdx}`}
                  {@const isTeamOpen = expandedTeams.has(teamKey)}
                  <!-- Team row -->
                  <tr class="standings-row {isTeamOpen ? 'row-open' : ''}">
                    <td class="standings-td-rank">{tIdx + 1}</td>
                    <td class="standings-td-team">
                      <span class="standings-flag">{team.flag}</span>
                      <span class="standings-name">{team.name}</span>
                      <span class="standings-code">{team.fifaCode}</span>
                    </td>
                    <td class="standings-td-num green">{team.w}</td>
                    <td class="standings-td-num neutral">{team.d}</td>
                    <td class="standings-td-num red">{team.l}</td>
                    <td class="standings-td-num blue">{team.gf}:{team.ga}</td>
                    <td class="standings-td-num {gdClass(team.gd)}">{gdStr(team.gd)}</td>
                    <td class="standings-td-pts">{team.points}</td>
                    <td class="standings-td-action">
                      <button
                        class="squad-toggle-btn {isTeamOpen ? 'open' : ''}"
                        onclick={() => toggleTeam(teamKey)}
                        aria-expanded={isTeamOpen}
                        aria-controls="squad-{teamKey}"
                        title="{isTeamOpen ? 'Hide' : 'Show'} squad"
                      >
                        <span class="squad-btn-label">{isTeamOpen ? 'Hide' : 'Squad'}</span>
                        <span class="squad-btn-arrow">▼</span>
                      </button>
                    </td>
                  </tr>
                  <!-- Squad expansion row -->
                  {#if isTeamOpen}
                    <tr class="squad-row" id="squad-{teamKey}" transition:slide={{ duration: 220 }}>
                      <td colspan="9" class="squad-row-cell">
                        <div class="players-table-wrap">
                          <table class="players-table">
                            <thead>
                              <tr>
                                <th class="num-col">#</th>
                                <th>Pos</th>
                                <th>Name</th>
                                <th>Club Country</th>
                                <th>Club</th>
                              </tr>
                            </thead>
                            <tbody>
                              {#each team.players as p}
                                <tr>
                                  <td class="col-num">{p.number}</td>
                                  <td class="col-pos">
                                    <span class="pos-badge pos-{p.pos}">{p.pos}</span>
                                  </td>
                                  <td class="col-name">{p.name}</td>
                                  <td>
                                    <div class="col-club-country">
                                      {#if p.club?.flag}
                                        <span class="flag-sm">{p.club.flag}</span>
                                      {/if}
                                      <span>{p.club?.country ?? "—"}</span>
                                    </div>
                                  </td>
                                  <td class="col-club-name">{p.club?.name ?? "—"}</td>
                                </tr>
                              {/each}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  {/if}
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {/each}
  </div>

  <!-- ── Footer ── -->
  <footer class="site-footer">
    <p>
      Project available at:
      <a
        href="https://github.com/jeff-knurek/fifa26"
        target="_blank"
        rel="noopener">jeff-knurek/fifa26</a
      >
      <br />
      Data sourced from:
      <a
        href="https://github.com/openfootball/worldcup.json"
        target="_blank"
        rel="noopener">openfootball/worldcup</a
      >
    </p>
  </footer>
</div>
