/**
 * Game Types Module
 * Defines game formats, team structures, and parsing logic for DUPR Pickleball Scheduler
 */

export enum GameType {
  DUPR_LADDER = 'dupr_ladder',
  PARTNER_DUPR = 'partner_dupr',
  PICKLEBROS_MONDAY = 'picklebros_monday',
}

export interface Team {
  player1: string;
  player2: string;
}

/**
 * Calculate team rating using DUPR's formula:
 * 35% of higher rating + 65% of lower rating
 *
 * @param rating1 First player's rating
 * @param rating2 Second player's rating
 * @returns Team rating rounded to 3 decimal places
 */
export function calculateTeamRating(rating1: number, rating2: number): number {
  const higher = Math.max(rating1, rating2);
  const lower = Math.min(rating1, rating2);
  return Math.round((0.35 * higher + 0.65 * lower) * 1000) / 1000;
}

/**
 * Parse DUPR Ladder player list from text input
 * - Split by newline
 * - Trim whitespace
 * - Remove empty lines
 * - Remove guest markers like "(G)" or "(Guest)"
 *
 * @param input Raw text input with player names
 * @returns Array of cleaned player names
 */
export function parseDuprLadderPlayers(input: string): string[] {
  // Guest marker patterns: (G), (g), (Guest), (guest)
  const guestMarkerPattern = /\s*\([Gg](uest)?\)\s*/g;

  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(guestMarkerPattern, '').trim())
    .filter((line) => line.length > 0);
}

/**
 * Parse Partner DUPR team pairs from text input
 * - Split by newline
 * - Each line: "Player1 / Player2" or "Player1/Player2"
 * - Trim whitespace from player names
 *
 * @param input Raw text input with team pairs
 * @returns Array of Team objects
 */
export function parsePartnerDuprTeams(input: string): Team[] {
  const teams: Team[] = [];

  const lines = input.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Skip lines without delimiter
    if (!trimmedLine.includes('/')) {
      continue;
    }

    const parts = trimmedLine.split('/');

    // Skip lines with more or fewer than 2 parts
    if (parts.length !== 2) {
      continue;
    }

    const player1 = parts[0].trim();
    const player2 = parts[1].trim();

    // Skip if either player name is empty
    if (player1 && player2) {
      teams.push({ player1, player2 });
    }
  }

  return teams;
}

/**
 * Validate PickleBros player count (must be multiple of 4)
 *
 * @param playerCount Number of players
 * @returns true if valid, false otherwise
 */
export function isValidPickleBrosCount(playerCount: number): boolean {
  return playerCount > 0 && playerCount % 4 === 0;
}
