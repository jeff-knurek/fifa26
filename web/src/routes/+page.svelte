<script>
  import GroupStage from '$lib/GroupStage.svelte';
  import KnockoutStage from '$lib/KnockoutStage.svelte';
  import TopScorers from '$lib/TopScorers.svelte';

  /** @type {import('./$types').PageData} */
  let { data } = $props();

  const groups = $derived(data.groups);
  const scorers = $derived(data.scorers);
  const knockoutRounds = $derived(data.knockoutRounds);
  const qualifiedThird = $derived(new Set(data.qualifiedThirdNames ?? []));

  let activeTab = $state('knockout');

  const tabs = [
    { id: 'group', label: 'Group Stage' },
    { id: 'knockout', label: 'Knockout Stage' },
    { id: 'scorers', label: 'Top Goal Scorers' },
  ];

  const totalTeams = $derived(groups.reduce((s, g) => s + g.teams.length, 0));
  const totalPlayers = $derived(
    groups.reduce((s, g) => s + g.teams.reduce((ts, t) => ts + t.players.length, 0), 0),
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

  <!-- ── Tab Navigation ── -->
  <div class="tab-nav" role="tablist" aria-label="Section tabs">
    {#each tabs as tab}
      <button
        class="tab-btn {activeTab === tab.id ? 'active' : ''}"
        role="tab"
        onclick={() => (activeTab = tab.id)}
        aria-selected={activeTab === tab.id}
      >{tab.label}</button>
    {/each}
  </div>

  <!-- ── Tab Content ── -->
  {#if activeTab === 'group'}
    <GroupStage {groups} {qualifiedThird} />
  {:else if activeTab === 'knockout'}
    <KnockoutStage {knockoutRounds} />
  {:else if activeTab === 'scorers'}
    <TopScorers {scorers} />
  {/if}

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
