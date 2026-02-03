/**
 * Unit tests for game-types module
 * Task: P1-PARSER-4
 */

import {
  GameType,
  Team,
  calculateTeamRating,
  parseDuprLadderPlayers,
  parsePartnerDuprTeams,
  isValidPickleBrosCount,
} from '../game-types';

describe('game-types', () => {
  describe('GameType enum', () => {
    it('should have DUPR_LADDER value', () => {
      expect(GameType.DUPR_LADDER).toBe('dupr_ladder');
    });

    it('should have PARTNER_DUPR value', () => {
      expect(GameType.PARTNER_DUPR).toBe('partner_dupr');
    });

    it('should have PICKLEBROS_MONDAY value', () => {
      expect(GameType.PICKLEBROS_MONDAY).toBe('picklebros_monday');
    });

    it('should have exactly three enum values', () => {
      const enumValues = Object.values(GameType);
      expect(enumValues).toHaveLength(3);
      expect(enumValues).toContain('dupr_ladder');
      expect(enumValues).toContain('partner_dupr');
      expect(enumValues).toContain('picklebros_monday');
    });
  });

  describe('Team interface', () => {
    it('should accept valid team structure', () => {
      const team: Team = {
        player1: 'John Smith',
        player2: 'Jane Doe',
      };
      expect(team.player1).toBe('John Smith');
      expect(team.player2).toBe('Jane Doe');
    });
  });

  describe('calculateTeamRating', () => {
    it('should calculate 35% higher + 65% lower for (4.0, 3.0)', () => {
      // 0.35 * 4.0 + 0.65 * 3.0 = 1.4 + 1.95 = 3.35
      expect(calculateTeamRating(4.0, 3.0)).toBe(3.35);
    });

    it('should return same rating when both players have equal ratings', () => {
      // 0.35 * 3.5 + 0.65 * 3.5 = 1.225 + 2.275 = 3.5
      expect(calculateTeamRating(3.5, 3.5)).toBe(3.5);
    });

    it('should produce same result regardless of argument order', () => {
      const rating1 = calculateTeamRating(4.0, 3.0);
      const rating2 = calculateTeamRating(3.0, 4.0);
      expect(rating1).toBe(rating2);
    });

    it('should calculate correctly for (4.25, 3.75) from fixtures', () => {
      // 0.35 * 4.25 + 0.65 * 3.75 = 1.4875 + 2.4375 = 3.925
      expect(calculateTeamRating(4.25, 3.75)).toBe(3.925);
    });

    it('should calculate correctly for (3.50, 3.25) from fixtures', () => {
      // 0.35 * 3.50 + 0.65 * 3.25 = 1.225 + 2.1125 = 3.3375 -> rounded to 3.338
      expect(calculateTeamRating(3.50, 3.25)).toBe(3.338);
    });

    it('should calculate correctly for (4.00, 3.50) from fixtures', () => {
      // 0.35 * 4.00 + 0.65 * 3.50 = 1.4 + 2.275 = 3.675
      expect(calculateTeamRating(4.00, 3.50)).toBe(3.675);
    });

    it('should calculate correctly for (3.80, 3.20) from fixtures', () => {
      // 0.35 * 3.80 + 0.65 * 3.20 = 1.33 + 2.08 = 3.41
      expect(calculateTeamRating(3.80, 3.20)).toBe(3.41);
    });

    it('should calculate correctly for (3.60, 3.40) from fixtures', () => {
      // 0.35 * 3.60 + 0.65 * 3.40 = 1.26 + 2.21 = 3.47
      expect(calculateTeamRating(3.60, 3.40)).toBe(3.47);
    });

    it('should round to 3 decimal places', () => {
      // Using values that would produce more than 3 decimals
      // 0.35 * 4.123 + 0.65 * 3.456 = 1.44305 + 2.2464 = 3.68945 -> 3.689
      const result = calculateTeamRating(4.123, 3.456);
      const decimalPlaces = result.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(3);
    });

    it('should handle very close ratings', () => {
      // 0.35 * 3.51 + 0.65 * 3.50 = 1.2285 + 2.275 = 3.5035 -> 3.504
      expect(calculateTeamRating(3.51, 3.50)).toBe(3.504);
    });

    it('should handle ratings at extreme ends (2.0 and 5.0)', () => {
      // 0.35 * 5.0 + 0.65 * 2.0 = 1.75 + 1.3 = 3.05
      expect(calculateTeamRating(5.0, 2.0)).toBe(3.05);
    });
  });

  describe('parseDuprLadderPlayers', () => {
    it('should parse basic player list', () => {
      const input = 'John Smith\nJane Doe\nBob Johnson';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John Smith', 'Jane Doe', 'Bob Johnson']);
    });

    it('should trim leading and trailing whitespace from names', () => {
      const input = '  John Smith  \n  Jane Doe  ';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John Smith', 'Jane Doe']);
    });

    it('should filter out empty lines', () => {
      const input = 'John\n\nJane\n\nBob';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John', 'Jane', 'Bob']);
    });

    it('should filter out whitespace-only lines', () => {
      const input = 'Player One\n   \nPlayer Two';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['Player One', 'Player Two']);
    });

    it('should remove (G) guest marker', () => {
      const input = 'John Smith (G)\nJane Doe';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John Smith', 'Jane Doe']);
    });

    it('should remove (g) lowercase guest marker', () => {
      const input = 'John Smith (g)\nJane Doe';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John Smith', 'Jane Doe']);
    });

    it('should remove (Guest) full guest marker', () => {
      const input = 'John Smith (Guest)\nJane Doe';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John Smith', 'Jane Doe']);
    });

    it('should remove (guest) lowercase full guest marker', () => {
      const input = 'John Smith (guest)\nJane Doe';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John Smith', 'Jane Doe']);
    });

    it('should handle single player input', () => {
      const input = 'John Smith';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John Smith']);
    });

    it('should return empty array for empty input', () => {
      const input = '';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only input', () => {
      const input = '   \n   \n   ';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual([]);
    });

    it('should handle combined edge cases from fixtures', () => {
      const input = '  John Smith  \nJane Doe\n   Leading Spaces\nTrailing Spaces   ';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual([
        'John Smith',
        'Jane Doe',
        'Leading Spaces',
        'Trailing Spaces',
      ]);
    });

    it('should handle empty lines mixed with players from fixtures', () => {
      const input = 'Player One\n\nPlayer Two\n   \nPlayer Three';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['Player One', 'Player Two', 'Player Three']);
    });

    it('should handle guest markers from fixtures', () => {
      const input = 'John Smith (G)\nJane Doe (Guest)\nRegular Player';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John Smith', 'Jane Doe', 'Regular Player']);
    });

    it('should handle names with guest markers and whitespace', () => {
      const input = '  John (G)  \n  Jane (Guest)  ';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John', 'Jane']);
    });

    it('should handle input with Windows-style line endings (CR+LF not applicable since split by LF)', () => {
      // Note: If input has \r\n, the \r will be left at end of each line
      // but trimming should handle it
      const input = 'John\nJane\nBob';
      const result = parseDuprLadderPlayers(input);
      expect(result).toEqual(['John', 'Jane', 'Bob']);
    });
  });

  describe('parsePartnerDuprTeams', () => {
    it('should parse basic team list with spaces around delimiter', () => {
      const input = 'John / Jane';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ player1: 'John', player2: 'Jane' });
    });

    it('should parse multiple teams', () => {
      const input = 'John / Jane\nBob / Alice';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ player1: 'John', player2: 'Jane' });
      expect(result[1]).toEqual({ player1: 'Bob', player2: 'Alice' });
    });

    it('should handle whitespace around names and delimiter', () => {
      const input = '  John Smith  /  Jane Doe  ';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ player1: 'John Smith', player2: 'Jane Doe' });
    });

    it('should handle no space around delimiter', () => {
      const input = 'John/Jane';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ player1: 'John', player2: 'Jane' });
    });

    it('should skip lines without delimiter', () => {
      const input = 'John / Jane\nInvalid Line\nBob / Alice';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ player1: 'John', player2: 'Jane' });
      expect(result[1]).toEqual({ player1: 'Bob', player2: 'Alice' });
    });

    it('should skip empty lines', () => {
      const input = 'John / Jane\n\nBob / Alice';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      const input = '';
      const result = parsePartnerDuprTeams(input);
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only input', () => {
      const input = '   \n   ';
      const result = parsePartnerDuprTeams(input);
      expect(result).toEqual([]);
    });

    it('should skip lines with only delimiter (empty player names)', () => {
      const input = ' / \nJohn / Jane';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ player1: 'John', player2: 'Jane' });
    });

    it('should skip lines with empty first player', () => {
      const input = ' / Jane\nJohn / Alice';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ player1: 'John', player2: 'Alice' });
    });

    it('should skip lines with empty second player', () => {
      const input = 'John / \nBob / Alice';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ player1: 'Bob', player2: 'Alice' });
    });

    it('should skip lines with multiple delimiters', () => {
      const input = 'John / Jane / Bob\nAlice / Carol';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ player1: 'Alice', player2: 'Carol' });
    });

    it('should handle edge cases from fixtures', () => {
      const input = `  John Smith  /  Jane Doe
Bob Johnson/Alice Anderson
Charlie   Brown / Diana    Prince
Equal Rating A / Equal Rating B`;
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ player1: 'John Smith', player2: 'Jane Doe' });
      expect(result[1]).toEqual({ player1: 'Bob Johnson', player2: 'Alice Anderson' });
      // Note: internal whitespace is NOT normalized by the function
      expect(result[2]).toEqual({ player1: 'Charlie   Brown', player2: 'Diana    Prince' });
      expect(result[3]).toEqual({ player1: 'Equal Rating A', player2: 'Equal Rating B' });
    });

    it('should handle full names with spaces', () => {
      const input = 'John Smith / Jane Doe\nBob Wilson / Alice Brown';
      const result = parsePartnerDuprTeams(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ player1: 'John Smith', player2: 'Jane Doe' });
      expect(result[1]).toEqual({ player1: 'Bob Wilson', player2: 'Alice Brown' });
    });
  });

  describe('isValidPickleBrosCount', () => {
    it('should return true for 4 players', () => {
      expect(isValidPickleBrosCount(4)).toBe(true);
    });

    it('should return true for 8 players', () => {
      expect(isValidPickleBrosCount(8)).toBe(true);
    });

    it('should return true for 12 players', () => {
      expect(isValidPickleBrosCount(12)).toBe(true);
    });

    it('should return true for 16 players', () => {
      expect(isValidPickleBrosCount(16)).toBe(true);
    });

    it('should return true for large multiples of 4', () => {
      expect(isValidPickleBrosCount(20)).toBe(true);
      expect(isValidPickleBrosCount(24)).toBe(true);
      expect(isValidPickleBrosCount(100)).toBe(true);
    });

    it('should return false for 0 players', () => {
      expect(isValidPickleBrosCount(0)).toBe(false);
    });

    it('should return false for 1 player', () => {
      expect(isValidPickleBrosCount(1)).toBe(false);
    });

    it('should return false for 2 players', () => {
      expect(isValidPickleBrosCount(2)).toBe(false);
    });

    it('should return false for 3 players', () => {
      expect(isValidPickleBrosCount(3)).toBe(false);
    });

    it('should return false for 5 players', () => {
      expect(isValidPickleBrosCount(5)).toBe(false);
    });

    it('should return false for 6 players', () => {
      expect(isValidPickleBrosCount(6)).toBe(false);
    });

    it('should return false for 7 players', () => {
      expect(isValidPickleBrosCount(7)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(isValidPickleBrosCount(-4)).toBe(false);
      expect(isValidPickleBrosCount(-1)).toBe(false);
    });

    it('should return false for non-multiples of 4', () => {
      expect(isValidPickleBrosCount(9)).toBe(false);
      expect(isValidPickleBrosCount(10)).toBe(false);
      expect(isValidPickleBrosCount(11)).toBe(false);
      expect(isValidPickleBrosCount(13)).toBe(false);
      expect(isValidPickleBrosCount(14)).toBe(false);
      expect(isValidPickleBrosCount(15)).toBe(false);
    });
  });
});
