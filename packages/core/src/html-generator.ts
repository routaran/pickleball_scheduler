/**
 * HTML Generator Module
 * Generates HTML reports for DUPR game formats
 */

import { calculateTeamRating } from './game-types';

// =============================================================================
// Types
// =============================================================================

export interface PlayerWithRating {
  name: string;
  rating: number;
  profileUrl: string | null;
  found: boolean;
  searchMethod: string;
}

export interface TeamWithRatings {
  player1: PlayerWithRating;
  player2: PlayerWithRating;
  teamRating: number;
}

export interface PlayerPool {
  name: string; // "A", "B", "C", "D"
  players: PlayerWithRating[];
}

export interface TeamPool {
  name: string; // "A", "B", "C", "D"
  teams: TeamWithRatings[];
}

// =============================================================================
// Constants
// =============================================================================

// Pool sizes optimized to minimize byes:
// - 4 players/teams per pool = ideal (no byes, all play simultaneously)
// - 5 players/teams per pool = acceptable (1 bye per round)
export const POOL_TARGET_SIZE = 4;
export const POOL_MIN_SIZE = 4;
export const PICKLEBROS_POOL_SIZE = 4;

// Rating tier thresholds
export const RATING_TIER_HIGH = 4.0;
export const RATING_TIER_MID = 3.0;

// =============================================================================
// Pool Distribution
// =============================================================================

/**
 * Distribute players into pools
 * - Sort by rating (highest first)
 * - Target pool size: 4 (minimizes byes - all players play simultaneously)
 * - Minimum pool size: 4
 * - Extra players distributed to lower-ranked pools (making them 5)
 *
 * @param players Array of players with ratings
 * @param targetSize Target players per pool (default 4)
 * @param minSize Minimum players per pool (default 4)
 */
export function distributePlayersToPool(
  players: PlayerWithRating[],
  targetSize = POOL_TARGET_SIZE,
  minSize = POOL_MIN_SIZE
): PlayerPool[] {
  if (players.length === 0) return [];
  if (players.length < minSize) {
    // Single pool with all players
    return [{ name: 'A', players: [...players].sort((a, b) => b.rating - a.rating) }];
  }

  // Sort players by rating (highest first)
  const sorted = [...players].sort((a, b) => b.rating - a.rating);

  // Calculate number of pools
  let numPools = Math.ceil(sorted.length / targetSize);

  // Reduce pool count if it would result in pools smaller than minSize
  while (numPools > 1 && sorted.length < numPools * minSize) {
    numPools--;
  }

  const baseSize = Math.floor(sorted.length / numPools);
  const remainder = sorted.length % numPools;

  // Distribute players - lower pools get extra players first
  const pools: PlayerPool[] = [];
  let playerIndex = 0;

  for (let i = 0; i < numPools; i++) {
    const poolName = String.fromCharCode(65 + i); // A, B, C, D...
    // Extra players go to LOWER pools (later pools in alphabet)
    const extraPlayer = i >= numPools - remainder ? 1 : 0;
    const poolSize = baseSize + extraPlayer;

    const poolPlayers = sorted.slice(playerIndex, playerIndex + poolSize);
    pools.push({ name: poolName, players: poolPlayers });
    playerIndex += poolSize;
  }

  return pools;
}

/**
 * Distribute players for PickleBros (exactly 4 per pool)
 */
export function distributePlayersToPickleBrosPools(players: PlayerWithRating[]): PlayerPool[] {
  if (players.length === 0) {
    return [];
  }

  if (players.length % PICKLEBROS_POOL_SIZE !== 0) {
    throw new Error(`PickleBros requires player count to be multiple of ${PICKLEBROS_POOL_SIZE}`);
  }

  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const pools: PlayerPool[] = [];

  for (let i = 0; i < sorted.length; i += PICKLEBROS_POOL_SIZE) {
    const poolName = String.fromCharCode(65 + pools.length);
    pools.push({
      name: poolName,
      players: sorted.slice(i, i + PICKLEBROS_POOL_SIZE),
    });
  }

  return pools;
}

/**
 * Distribute teams into pools (for Partner DUPR)
 * - Sort by team rating (highest first)
 * - Target pool size: 4 teams (minimizes byes - 2 courts, all teams play)
 * - Minimum pool size: 4 teams
 * - Extra teams distributed to lower-ranked pools (making them 5)
 */
export function distributeTeamsToPool(
  teams: TeamWithRatings[],
  targetSize = POOL_TARGET_SIZE,
  minSize = POOL_MIN_SIZE
): TeamPool[] {
  if (teams.length === 0) return [];
  if (teams.length < minSize) {
    // Single pool with all teams
    return [{ name: 'A', teams: [...teams].sort((a, b) => b.teamRating - a.teamRating) }];
  }

  // Sort teams by rating (highest first)
  const sorted = [...teams].sort((a, b) => b.teamRating - a.teamRating);

  // Calculate number of pools
  let numPools = Math.ceil(sorted.length / targetSize);

  // Reduce pool count if it would result in pools smaller than minSize
  while (numPools > 1 && sorted.length < numPools * minSize) {
    numPools--;
  }

  const baseSize = Math.floor(sorted.length / numPools);
  const remainder = sorted.length % numPools;

  // Distribute teams - lower pools get extra teams first
  const pools: TeamPool[] = [];
  let teamIndex = 0;

  for (let i = 0; i < numPools; i++) {
    const poolName = String.fromCharCode(65 + i); // A, B, C, D...
    // Extra teams go to LOWER pools (later pools in alphabet)
    const extraTeam = i >= numPools - remainder ? 1 : 0;
    const poolSize = baseSize + extraTeam;

    const poolTeams = sorted.slice(teamIndex, teamIndex + poolSize);
    pools.push({ name: poolName, teams: poolTeams });
    teamIndex += poolSize;
  }

  return pools;
}

// =============================================================================
// CSS Styles
// =============================================================================

const BASE_STYLES = `
<style>
  :root {
    /* Color System */
    --color-primary: #2563eb;
    --color-primary-dark: #1d4ed8;
    --color-success: #059669;
    --color-success-light: #d1fae5;
    --color-warning: #d97706;
    --color-warning-light: #fef3c7;
    --color-muted: #6b7280;
    --color-muted-light: #9ca3af;

    /* Rating tier colors */
    --tier-high: #059669;
    --tier-high-bg: #d1fae5;
    --tier-mid: #2563eb;
    --tier-mid-bg: #dbeafe;
    --tier-low: #d97706;
    --tier-low-bg: #fef3c7;

    /* Surface colors */
    --surface-card: #ffffff;
    --surface-alt: #f9fafb;
    --border-color: #e5e7eb;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background: var(--surface-alt);
    color: #1f2937;
  }
  .container { max-width: 1200px; margin: 0 auto; }

  /* Typography */
  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.25rem;
  }
  .page-subtitle {
    font-size: 0.9rem;
    color: var(--color-muted);
    margin-bottom: 1rem;
  }

  /* Pool Cards */
  .pool {
    background: var(--surface-card);
    border-radius: 12px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
    overflow: hidden;
  }
  .pool-header {
    padding: 1rem 1.25rem;
    color: white;
    font-weight: 600;
    font-size: 1.1em;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pool-header.pool-a { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
  .pool-header.pool-b { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); }
  .pool-header.pool-c { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); }
  .pool-header.pool-d { background: linear-gradient(135deg, #db2777 0%, #be185d 100%); }
  .pool-header.pool-default { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }

  .pool-name { font-size: 1.25rem; font-weight: 700; }
  .pool-meta { font-size: 0.85rem; opacity: 0.9; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
  th { background: var(--surface-alt); font-weight: 600; color: #374151; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  tr:last-child td { border-bottom: none; }
  tr:hover { background: var(--surface-alt); }

  /* Ladder Rows */
  .ladder-row {
    padding: 0.75rem 1.25rem;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
  }
  .ladder-row:nth-child(even) { background-color: var(--surface-alt); }
  .ladder-row:last-child { border-bottom: none; }
  .ladder-row.unresolved { background-color: #fffbeb !important; }

  .rank-badge {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--color-muted);
    background: var(--surface-alt);
    border-radius: 50%;
    margin-right: 0.875rem;
    flex-shrink: 0;
  }
  .ladder-row:nth-child(even) .rank-badge { background: var(--surface-card); }

  /* Rating Badges */
  .rating {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
    font-weight: 600;
    font-size: 0.95rem;
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
  }
  .rating-high { background-color: var(--tier-high-bg); color: var(--tier-high); }
  .rating-mid { background-color: var(--tier-mid-bg); color: var(--tier-mid); }
  .rating-low { background-color: var(--tier-low-bg); color: var(--tier-low); }

  .badge-default {
    background-color: #fef3c7;
    color: #92400e;
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
    margin-left: 0.35rem;
    border-radius: 4px;
    vertical-align: middle;
  }

  /* Player names */
  .player-name { font-weight: 600; font-size: 1rem; color: #1f2937; flex-grow: 1; }
  .player-name a { color: inherit; text-decoration: none; }
  .player-name a:hover { color: var(--color-primary); }
  .not-found { color: var(--color-muted-light); font-style: italic; }
  .player-link { color: var(--color-primary); text-decoration: none; }
  .player-link:hover { text-decoration: underline; }
  .profile-link {
    color: var(--color-muted-light);
    font-size: 0.9rem;
    margin-left: 0.5rem;
    text-decoration: none;
  }
  .profile-link:hover { color: var(--color-primary); }

  /* Team-specific styles */
  .team-rating { font-size: 1.1em; }
  .player-rating { font-size: 0.9em; color: var(--color-muted); }
  .team-dupr {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
  }
  .team-dupr.tier-highest { background: #dcfce7; color: #166534; }
  .team-dupr.tier-high { background: #dbeafe; color: #1e40af; }
  .team-dupr.tier-mid { background: #fef3c7; color: #92400e; }
  .team-dupr.tier-low { background: #fee2e2; color: #991b1b; }

  .team-players { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; }
  .player-cell { display: flex; align-items: center; gap: 0.5rem; }
  .individual-ratings {
    display: flex;
    gap: 0.5rem;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
    font-size: 0.85rem;
    color: var(--color-muted);
  }
  .team-rank {
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    color: var(--color-muted);
    background: var(--surface-alt);
    border-radius: 50%;
  }
  .team-row:nth-child(even) .team-rank { background: var(--surface-card); }

  /* Summary */
  .summary-card {
    background: var(--surface-card);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-color);
  }
  .summary-success { border-left: 4px solid var(--color-success); }
  .summary-warning { border-left: 4px solid var(--color-warning); }
  .unresolved-list {
    background: #fffbeb;
    border-radius: 8px;
    padding: 0.875rem 1rem;
    margin-top: 1rem;
    border: 1px solid #fcd34d;
  }
  .unresolved-list ul { margin: 0; padding-left: 1.25rem; }
  .unresolved-list li { color: #92400e; font-size: 0.9rem; }

  /* Header stats */
  .header-stats {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-muted);
  }
  .header-stat { display: flex; align-items: center; gap: 0.35rem; }

  /* Mobile Team Cards (Partner DUPR) */
  .team-cards-mobile { display: none; }
  .team-card {
    background: var(--surface-card);
    border-radius: 10px;
    margin-bottom: 0.75rem;
    border: 1px solid var(--border-color);
    overflow: hidden;
  }
  .team-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid var(--border-color);
  }
  .team-card-rank {
    font-weight: 800;
    font-size: 1.25rem;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .team-card-rank::before {
    content: '#';
    font-weight: 600;
    color: var(--color-muted-light);
    font-size: 1rem;
  }
  .team-card-rating {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
    font-size: 1.15rem;
    font-weight: 700;
    padding: 0.4rem 0.875rem;
    border-radius: 8px;
  }
  .team-card-body { padding: 0; }
  .team-card-player {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  .team-card-player:last-child { border-bottom: none; }
  .team-card-player:nth-child(odd) { background: var(--surface-card); }
  .team-card-player:nth-child(even) { background: var(--surface-alt); }
  .team-card-player-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: #1f2937;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .team-card-player-name a { color: inherit; text-decoration: none; }
  .team-card-player-name a:hover { color: var(--color-primary); }
  .team-card-player-name.not-found { color: var(--color-muted-light); font-style: italic; }
  .team-card-player-rating {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-muted);
    margin-left: 1rem;
    flex-shrink: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .page-title { font-size: 1.5rem; }
    .team-players { flex-direction: column; gap: 0.5rem; }
    .pool-header { flex-direction: column; gap: 0.5rem; align-items: flex-start; }
    .ladder-row { flex-wrap: wrap; }
    .header-stats { flex-direction: column; gap: 0.5rem; }

    /* Partner DUPR: Hide table, show cards on mobile */
    .partner-dupr-table { display: none; }
    .team-cards-mobile { display: block; padding: 0.75rem; }
  }

  /* Print styles */
  @media print {
    body { background: white !important; color: black !important; font-size: 10pt; padding: 0; }
    .container { max-width: 100% !important; padding: 0 !important; }
    .pool {
      box-shadow: none !important;
      border: 2px solid #000 !important;
      page-break-inside: avoid;
      margin-bottom: 1rem;
    }
    .pool-header {
      background: #f0f0f0 !important;
      color: black !important;
      border-bottom: 2px solid black !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pool-header.pool-a,
    .pool-header.pool-b,
    .pool-header.pool-c,
    .pool-header.pool-d,
    .pool-header.pool-default { background: #f0f0f0 !important; }
    .rating, .team-dupr { background: none !important; border: 1px solid #000; }
    .profile-link { display: none !important; }
    .summary-card { border: 1px solid #000 !important; }
    /* Print: show table, hide mobile cards */
    .partner-dupr-table { display: table !important; }
    .team-cards-mobile { display: none !important; }
    a { color: black !important; text-decoration: none !important; }
  }
</style>
`;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get CSS class for rating tier
 */
function getRatingClass(rating: number): string {
  if (rating >= RATING_TIER_HIGH) return 'rating-high';
  if (rating >= RATING_TIER_MID) return 'rating-mid';
  return 'rating-low';
}

/**
 * Get CSS class for team rating tier (Partner DUPR)
 */
function getTeamRatingTierClass(teamRating: number): string {
  if (teamRating >= 4.0) return 'tier-highest';
  if (teamRating >= 3.5) return 'tier-high';
  if (teamRating >= 3.0) return 'tier-mid';
  return 'tier-low';
}

/**
 * Format rating for display
 */
function formatRating(rating: number | null | undefined): string {
  if (rating == null) return 'N/A';
  // Handle case where rating might be a string
  const numRating = typeof rating === 'number' ? rating : parseFloat(String(rating));
  if (isNaN(numRating)) return 'N/A';
  return numRating.toFixed(2);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render player name with optional link
 */
function renderPlayerName(player: PlayerWithRating): string {
  const name = escapeHtml(player.name);
  if (!player.found) {
    return `<span class="not-found">${name}</span>`;
  }
  if (player.profileUrl) {
    return `<a href="${escapeHtml(player.profileUrl)}" class="player-link" target="_blank">${name}</a>`;
  }
  return name;
}

/**
 * Render player name with profile link icon (for ladder/pool views)
 */
function renderPlayerNameWithIcon(player: PlayerWithRating): string {
  const name = escapeHtml(player.name);
  let html = `<span class="player-name">${name}</span>`;
  if (player.profileUrl) {
    html += `<a href="${escapeHtml(player.profileUrl)}" target="_blank" class="profile-link" title="View DUPR Profile">[link]</a>`;
  }
  return html;
}

/**
 * Render rating badge with tier coloring
 */
function renderRatingBadge(rating: number, found: boolean): string {
  const tierClass = getRatingClass(rating);
  let badge = `<span class="rating ${tierClass}">${formatRating(rating)}</span>`;
  if (!found) {
    badge += '<span class="badge-default">Default</span>';
  }
  return badge;
}

/**
 * Get pool header CSS class based on pool name
 */
function getPoolHeaderClass(poolName: string): string {
  const poolLower = poolName.toLowerCase();
  if (['a', 'b', 'c', 'd'].includes(poolLower)) {
    return `pool-${poolLower}`;
  }
  return 'pool-default';
}

/**
 * Generate resolution summary HTML
 */
function generateResolutionSummary(
  totalPlayers: number,
  resolvedCount: number,
  unresolvedNames: string[]
): string {
  const statusClass = resolvedCount === totalPlayers ? 'summary-success' : 'summary-warning';
  const statusIcon = resolvedCount === totalPlayers ? 'check-circle' : 'exclamation-triangle';

  let html = `
    <div class="summary-card ${statusClass}">
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 0.5rem;">[${statusIcon}]</span>
        <span><strong>${resolvedCount}/${totalPlayers} players resolved</strong></span>
      </div>
  `;

  if (unresolvedNames.length > 0) {
    html += `
      <div class="unresolved-list">
        <strong style="color: #92400e; font-size: 0.85rem;">Using default rating (2.5):</strong>
        <ul style="margin-top: 0.5rem;">
    `;
    for (const name of unresolvedNames) {
      html += `<li>${escapeHtml(name)}</li>`;
    }
    html += '</ul></div>';
  }

  html += '</div>';
  return html;
}

/**
 * Format current date for display
 */
function formatDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return now.toLocaleDateString('en-US', options);
}

// =============================================================================
// HTML Generators
// =============================================================================

/**
 * Generate HTML for DUPR Ladder format
 */
export function generateDuprLadderHtml(players: PlayerWithRating[]): string {
  const pools = distributePlayersToPool(players);
  const dateStr = formatDate();

  const resolved = players.filter((p) => p.found).length;
  const unresolved = players.filter((p) => !p.found).map((p) => p.name);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DUPR Ladder Results</title>
  ${BASE_STYLES}
</head>
<body>
  <div class="container">
    <h1 class="page-title">DUPR Ladder</h1>
    <p class="page-subtitle">${escapeHtml(dateStr)}</p>

    ${generateResolutionSummary(players.length, resolved, unresolved)}
`;

  for (const pool of pools) {
    const headerClass = getPoolHeaderClass(pool.name);
    html += `
    <div class="pool">
      <div class="pool-header ${headerClass}">
        <span class="pool-name">POOL ${pool.name}</span>
        <span class="pool-meta">(${pool.players.length} players)</span>
      </div>
`;

    pool.players.forEach((player, idx) => {
      const unresolvedClass = !player.found ? ' unresolved' : '';
      html += `      <div class="ladder-row${unresolvedClass}">
        <span class="rank-badge">${idx + 1}</span>
        <div class="player-name" style="flex-grow: 1;">
          ${renderPlayerNameWithIcon(player)}
        </div>
        ${renderRatingBadge(player.rating, player.found)}
      </div>
`;
    });

    html += `    </div>
`;
  }

  html += `  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate HTML for Partner DUPR format
 * Teams are distributed into pools of 4-5, similar to DUPR Ladder
 */
export function generatePartnerDuprHtml(teams: TeamWithRatings[]): string {
  // Distribute teams into pools
  const pools = distributeTeamsToPool(teams);
  const dateStr = formatDate();

  // Collect all players for resolution summary
  const allPlayers: PlayerWithRating[] = [];
  for (const team of teams) {
    allPlayers.push(team.player1, team.player2);
  }
  const resolved = allPlayers.filter((p) => p.found).length;
  const unresolved = allPlayers.filter((p) => !p.found).map((p) => p.name);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partner DUPR Results</title>
  ${BASE_STYLES}
</head>
<body>
  <div class="container">
    <h1 class="page-title">Partner DUPR</h1>
    <p class="page-subtitle">${escapeHtml(dateStr)}</p>
    <div class="header-stats">
      <span class="header-stat">${teams.length} Teams</span>
      <span class="header-stat">${resolved}/${allPlayers.length} players resolved</span>
    </div>

    ${generateResolutionSummary(allPlayers.length, resolved, unresolved)}
`;

  // Generate each pool
  pools.forEach((pool) => {
    const poolClass = getPoolHeaderClass(pool.name);

    // Desktop table view
    html += `
    <div class="pool">
      <div class="pool-header ${poolClass}">
        <span class="pool-name">Pool ${pool.name}</span>
        <span class="pool-meta">(${pool.teams.length} teams)</span>
      </div>
      <table class="partner-dupr-table">
        <thead>
          <tr>
            <th style="width: 60px;">#</th>
            <th>Team</th>
            <th style="width: 120px; text-align: center;">Ind. DUPR</th>
            <th style="width: 100px; text-align: right;">Team Rating</th>
          </tr>
        </thead>
        <tbody>
`;

    pool.teams.forEach((team, idx) => {
      const p1 = team.player1;
      const p2 = team.player2;
      const teamTierClass = getTeamRatingTierClass(team.teamRating);

      html += `          <tr class="team-row">
            <td>
              <div class="team-rank">${idx + 1}</div>
            </td>
            <td>
              <div class="team-players">
                <div class="player-cell">
                  ${renderPlayerName(p1)}
                </div>
                <div class="player-cell">
                  ${renderPlayerName(p2)}
                </div>
              </div>
            </td>
            <td style="text-align: center;">
              <div class="individual-ratings">
                <span>${formatRating(p1.rating)}</span>
                <span>${formatRating(p2.rating)}</span>
              </div>
            </td>
            <td style="text-align: right;">
              <span class="team-dupr ${teamTierClass}">${formatRating(team.teamRating)}</span>
            </td>
          </tr>
`;
    });

    html += `        </tbody>
      </table>
      <div class="team-cards-mobile">
`;

    // Mobile card layout for this pool
    pool.teams.forEach((team, idx) => {
      const p1 = team.player1;
      const p2 = team.player2;
      const teamTierClass = getTeamRatingTierClass(team.teamRating);

      html += `        <div class="team-card">
          <div class="team-card-header">
            <span class="team-card-rank">${idx + 1}</span>
            <span class="team-card-rating team-dupr ${teamTierClass}">${formatRating(team.teamRating)}</span>
          </div>
          <div class="team-card-body">
            <div class="team-card-player">
              <span class="team-card-player-name${p1.found ? '' : ' not-found'}">${p1.profileUrl ? `<a href="${escapeHtml(p1.profileUrl)}" target="_blank">${escapeHtml(p1.name)}</a>` : escapeHtml(p1.name)}</span>
              <span class="team-card-player-rating">${formatRating(p1.rating)}</span>
            </div>
            <div class="team-card-player">
              <span class="team-card-player-name${p2.found ? '' : ' not-found'}">${p2.profileUrl ? `<a href="${escapeHtml(p2.profileUrl)}" target="_blank">${escapeHtml(p2.name)}</a>` : escapeHtml(p2.name)}</span>
              <span class="team-card-player-rating">${formatRating(p2.rating)}</span>
            </div>
          </div>
        </div>
`;
    });

    html += `      </div>
    </div>
`;
  });

  html += `  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate HTML for PickleBros Monday format
 */
export function generatePickleBrosMondayHtml(players: PlayerWithRating[]): string {
  const pools = distributePlayersToPickleBrosPools(players);
  const dateStr = formatDate();

  const resolved = players.filter((p) => p.found).length;
  const unresolved = players.filter((p) => !p.found).map((p) => p.name);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PickleBros Monday Results</title>
  ${BASE_STYLES}
</head>
<body>
  <div class="container">
    <h1 class="page-title">PickleBros Monday</h1>
    <p class="page-subtitle">${escapeHtml(dateStr)} | Fixed 4-Player Pools</p>

    ${generateResolutionSummary(players.length, resolved, unresolved)}
`;

  for (const pool of pools) {
    const headerClass = getPoolHeaderClass(pool.name);
    html += `
    <div class="pool">
      <div class="pool-header ${headerClass}">
        <span class="pool-name">POOL ${pool.name}</span>
        <span class="pool-meta">(4 players)</span>
      </div>
`;

    pool.players.forEach((player, idx) => {
      const unresolvedClass = !player.found ? ' unresolved' : '';
      html += `      <div class="ladder-row${unresolvedClass}">
        <span class="rank-badge">${idx + 1}</span>
        <div class="player-name" style="flex-grow: 1;">
          ${renderPlayerNameWithIcon(player)}
        </div>
        ${renderRatingBadge(player.rating, player.found)}
      </div>
`;
    });

    html += `    </div>
`;
  }

  html += `  </div>
</body>
</html>`;

  return html;
}

/**
 * Create a TeamWithRatings from two players
 */
export function createTeamWithRatings(player1: PlayerWithRating, player2: PlayerWithRating): TeamWithRatings {
  return {
    player1,
    player2,
    teamRating: calculateTeamRating(player1.rating, player2.rating),
  };
}
