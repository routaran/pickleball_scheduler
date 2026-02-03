/**
 * Unit tests for html-generator module
 * Task: P1-HTMLGEN-2
 */

import {
  distributePlayersToPool,
  distributePlayersToPickleBrosPools,
  generateDuprLadderHtml,
  generatePartnerDuprHtml,
  generatePickleBrosMondayHtml,
  createTeamWithRatings,
  PlayerWithRating,
  TeamWithRatings,
  PlayerPool,
  POOL_TARGET_SIZE,
  POOL_MIN_SIZE,
  PICKLEBROS_POOL_SIZE,
  RATING_TIER_HIGH,
  RATING_TIER_MID,
} from '../html-generator';

describe('html-generator', () => {
  // =============================================================================
  // Test Data Helpers
  // =============================================================================

  /**
   * Create a test player with default values
   */
  const createPlayer = (
    name: string,
    rating: number,
    found = true,
    searchMethod = 'exact'
  ): PlayerWithRating => ({
    name,
    rating,
    profileUrl: found ? `https://example.com/${name.toLowerCase().replace(/ /g, '-')}` : null,
    found,
    searchMethod: found ? searchMethod : 'default',
  });

  // Sample test data sets
  const players10 = [
    createPlayer('Player 1', 4.5),
    createPlayer('Player 2', 4.3),
    createPlayer('Player 3', 4.1),
    createPlayer('Player 4', 3.9),
    createPlayer('Player 5', 3.7),
    createPlayer('Player 6', 3.5),
    createPlayer('Player 7', 3.3),
    createPlayer('Player 8', 3.1),
    createPlayer('Player 9', 2.9),
    createPlayer('Player 10', 2.7),
  ];

  // =============================================================================
  // Constants Tests
  // =============================================================================

  describe('constants', () => {
    it('should export POOL_TARGET_SIZE as 5', () => {
      expect(POOL_TARGET_SIZE).toBe(5);
    });

    it('should export POOL_MIN_SIZE as 4', () => {
      expect(POOL_MIN_SIZE).toBe(4);
    });

    it('should export PICKLEBROS_POOL_SIZE as 4', () => {
      expect(PICKLEBROS_POOL_SIZE).toBe(4);
    });

    it('should export RATING_TIER_HIGH as 4.0', () => {
      expect(RATING_TIER_HIGH).toBe(4.0);
    });

    it('should export RATING_TIER_MID as 3.0', () => {
      expect(RATING_TIER_MID).toBe(3.0);
    });
  });

  // =============================================================================
  // distributePlayersToPool Tests
  // =============================================================================

  describe('distributePlayersToPool', () => {
    it('should distribute 10 players into 2 pools of 5', () => {
      const pools = distributePlayersToPool(players10);

      expect(pools).toHaveLength(2);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(5);
      expect(pools[1].name).toBe('B');
      expect(pools[1].players).toHaveLength(5);
    });

    it('should give lower pools extra players (18 players → pools of 4,4,5,5)', () => {
      // 18 players with target 5 → 4 pools: 4+4+5+5
      const players18 = Array.from({ length: 18 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );

      const pools = distributePlayersToPool(players18);

      expect(pools).toHaveLength(4);
      // Lower pools (C, D) get extra players
      expect(pools[0].players.length).toBeLessThanOrEqual(pools[3].players.length);
      // Verify total players distributed
      const totalDistributed = pools.reduce((sum, pool) => sum + pool.players.length, 0);
      expect(totalDistributed).toBe(18);
    });

    it('should return empty array for empty input', () => {
      const pools = distributePlayersToPool([]);
      expect(pools).toEqual([]);
    });

    it('should create single pool for fewer than minSize players', () => {
      const players3 = players10.slice(0, 3);
      const pools = distributePlayersToPool(players3);

      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(3);
    });

    it('should create single pool for exactly minSize players', () => {
      const players4 = players10.slice(0, 4);
      const pools = distributePlayersToPool(players4);

      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(4);
    });

    it('should sort players by rating (highest first)', () => {
      // Shuffle the players array to test sorting
      const shuffled = [
        createPlayer('Low', 2.5),
        createPlayer('High', 4.5),
        createPlayer('Mid', 3.5),
      ];
      const pools = distributePlayersToPool(shuffled);

      expect(pools[0].players[0].rating).toBe(4.5);
      expect(pools[0].players[1].rating).toBe(3.5);
      expect(pools[0].players[2].rating).toBe(2.5);
    });

    it('should sort within each pool by rating (highest first)', () => {
      const pools = distributePlayersToPool(players10);

      // Pool A should have top 5 rated players
      expect(pools[0].players[0].rating).toBe(4.5);
      expect(pools[0].players[4].rating).toBe(3.7);

      // Pool B should have lower rated players
      expect(pools[1].players[0].rating).toBe(3.5);
      expect(pools[1].players[4].rating).toBe(2.7);
    });

    it('should name pools alphabetically (A, B, C, D...)', () => {
      const players20 = Array.from({ length: 20 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const pools = distributePlayersToPool(players20);

      expect(pools[0].name).toBe('A');
      expect(pools[1].name).toBe('B');
      expect(pools[2].name).toBe('C');
      expect(pools[3].name).toBe('D');
    });

    it('should handle 5 players as single pool', () => {
      const players5 = players10.slice(0, 5);
      const pools = distributePlayersToPool(players5);

      expect(pools).toHaveLength(1);
      expect(pools[0].players).toHaveLength(5);
    });

    it('should handle 6 players as single pool (less than 2 * minSize)', () => {
      const players6 = players10.slice(0, 6);
      const pools = distributePlayersToPool(players6);

      // 6 players: if we made 2 pools, each would have 3 (< minSize)
      // So it should be 1 pool of 6
      expect(pools).toHaveLength(1);
      expect(pools[0].players).toHaveLength(6);
    });

    it('should handle 8 players as 2 pools of 4', () => {
      const players8 = players10.slice(0, 8);
      const pools = distributePlayersToPool(players8);

      expect(pools).toHaveLength(2);
      expect(pools[0].players).toHaveLength(4);
      expect(pools[1].players).toHaveLength(4);
    });

    it('should handle 9 players as 2 pools (4 and 5)', () => {
      const players9 = players10.slice(0, 9);
      const pools = distributePlayersToPool(players9);

      expect(pools).toHaveLength(2);
      // Lower pool (B) gets the extra player
      expect(pools[0].players.length + pools[1].players.length).toBe(9);
    });

    it('should handle single player input', () => {
      const player = [createPlayer('Solo', 3.5)];
      const pools = distributePlayersToPool(player);

      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(1);
    });

    it('should accept custom target and min sizes', () => {
      const players12 = Array.from({ length: 12 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );

      // Use target 4, min 3
      const pools = distributePlayersToPool(players12, 4, 3);

      expect(pools).toHaveLength(3);
      pools.forEach((pool) => {
        expect(pool.players.length).toBe(4);
      });
    });
  });

  // =============================================================================
  // distributePlayersToPickleBrosPools Tests
  // =============================================================================

  describe('distributePlayersToPickleBrosPools', () => {
    it('should distribute 8 players into 2 pools of 4', () => {
      const players8 = players10.slice(0, 8);
      const pools = distributePlayersToPickleBrosPools(players8);

      expect(pools).toHaveLength(2);
      expect(pools[0].players).toHaveLength(4);
      expect(pools[1].players).toHaveLength(4);
    });

    it('should distribute 12 players into 3 pools of 4', () => {
      const players12 = Array.from({ length: 12 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const pools = distributePlayersToPickleBrosPools(players12);

      expect(pools).toHaveLength(3);
      pools.forEach((pool) => {
        expect(pool.players).toHaveLength(4);
      });
    });

    it('should throw error for non-multiple of 4 (5 players)', () => {
      const players5 = players10.slice(0, 5);

      expect(() => distributePlayersToPickleBrosPools(players5)).toThrow(
        `PickleBros requires player count to be multiple of ${PICKLEBROS_POOL_SIZE}`
      );
    });

    it('should throw error for non-multiple of 4 (7 players)', () => {
      const players7 = players10.slice(0, 7);

      expect(() => distributePlayersToPickleBrosPools(players7)).toThrow();
    });

    it('should return empty array for empty input', () => {
      const pools = distributePlayersToPickleBrosPools([]);
      expect(pools).toEqual([]);
    });

    it('should distribute 4 players into 1 pool of 4', () => {
      const players4 = players10.slice(0, 4);
      const pools = distributePlayersToPickleBrosPools(players4);

      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(4);
    });

    it('should sort players by rating (highest first)', () => {
      const shuffled = [
        createPlayer('P4', 3.0),
        createPlayer('P1', 4.5),
        createPlayer('P3', 3.5),
        createPlayer('P2', 4.0),
      ];
      const pools = distributePlayersToPickleBrosPools(shuffled);

      expect(pools[0].players[0].rating).toBe(4.5);
      expect(pools[0].players[1].rating).toBe(4.0);
      expect(pools[0].players[2].rating).toBe(3.5);
      expect(pools[0].players[3].rating).toBe(3.0);
    });

    it('should name pools alphabetically (A, B, C...)', () => {
      const players16 = Array.from({ length: 16 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const pools = distributePlayersToPickleBrosPools(players16);

      expect(pools[0].name).toBe('A');
      expect(pools[1].name).toBe('B');
      expect(pools[2].name).toBe('C');
      expect(pools[3].name).toBe('D');
    });

    it('should distribute top 4 to Pool A, next 4 to Pool B', () => {
      const players8 = players10.slice(0, 8);
      const pools = distributePlayersToPickleBrosPools(players8);

      // Pool A should have top 4 rated players
      expect(pools[0].players.map((p) => p.rating)).toEqual([4.5, 4.3, 4.1, 3.9]);
      // Pool B should have next 4
      expect(pools[1].players.map((p) => p.rating)).toEqual([3.7, 3.5, 3.3, 3.1]);
    });
  });

  // =============================================================================
  // Rating Tier Tests
  // =============================================================================

  describe('rating tier classes', () => {
    it('should apply rating-high class for rating >= 4.0', () => {
      const player = createPlayer('High Rated', 4.0);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-high');
    });

    it('should apply rating-high class for rating 4.5', () => {
      const player = createPlayer('Very High', 4.5);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-high');
    });

    it('should apply rating-mid class for rating >= 3.0 and < 4.0', () => {
      const player = createPlayer('Mid Rated', 3.5);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-mid');
    });

    it('should apply rating-mid class for exactly 3.0', () => {
      const player = createPlayer('Exactly Mid', 3.0);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-mid');
    });

    it('should apply rating-low class for rating < 3.0', () => {
      const player = createPlayer('Low Rated', 2.5);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-low');
    });

    it('should apply rating-low class for rating 2.9', () => {
      const player = createPlayer('Just Below Mid', 2.9);
      const html = generateDuprLadderHtml([player]);

      expect(html).toContain('rating-low');
    });

    it('should correctly categorize multiple players across all tiers', () => {
      const players = [
        createPlayer('High', 4.2),
        createPlayer('Mid', 3.5),
        createPlayer('Low', 2.5),
      ];
      const html = generateDuprLadderHtml(players);

      expect(html).toContain('rating-high');
      expect(html).toContain('rating-mid');
      expect(html).toContain('rating-low');
    });
  });

  // =============================================================================
  // generateDuprLadderHtml Tests
  // =============================================================================

  describe('generateDuprLadderHtml', () => {
    it('should generate valid HTML structure with DOCTYPE', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should contain proper HTML head elements', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('<head>');
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<title>DUPR Ladder Results</title>');
      expect(html).toContain('</head>');
    });

    it('should contain page title', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('DUPR Ladder');
      expect(html).toContain('class="page-title"');
    });

    it('should contain pool headers', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('POOL A');
      expect(html).toContain('POOL B');
      expect(html).toContain('pool-header');
    });

    it('should contain all player names', () => {
      const html = generateDuprLadderHtml(players10);

      players10.forEach((player) => {
        expect(html).toContain(player.name);
      });
    });

    it('should contain player ratings formatted to 2 decimal places', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('4.50'); // Player 1
      expect(html).toContain('4.30'); // Player 2
      expect(html).toContain('2.70'); // Player 10
    });

    it('should apply rating tier classes', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('rating-high'); // >= 4.0
      expect(html).toContain('rating-mid'); // >= 3.0
      expect(html).toContain('rating-low'); // < 3.0
    });

    it('should mark unfound players with not-found class', () => {
      const playersWithUnfound = [
        createPlayer('Found Player', 4.0, true),
        createPlayer('Unknown Player', 3.0, false),
      ];
      const html = generateDuprLadderHtml(playersWithUnfound);

      expect(html).toContain('not-found');
      expect(html).toContain('Unknown Player');
    });

    it('should show default badge for unfound players', () => {
      const playersWithUnfound = [createPlayer('Unknown', 3.0, false)];
      const html = generateDuprLadderHtml(playersWithUnfound);

      expect(html).toContain('badge-default');
      expect(html).toContain('Default');
    });

    it('should include profile links for found players', () => {
      const html = generateDuprLadderHtml([createPlayer('John Doe', 4.0, true)]);

      expect(html).toContain('profile-link');
      expect(html).toContain('href="https://example.com/john-doe"');
    });

    it('should not include profile links for unfound players', () => {
      const player = createPlayer('Unknown', 3.0, false);
      const html = generateDuprLadderHtml([player]);

      // No profile link element should be present for unfound player
      expect(html).not.toContain('href="https://example.com/unknown"');
    });

    it('should contain CSS styles', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toContain(':root');
    });

    it('should include player count in pool headers', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('(5 players)');
    });

    it('should contain rank badges', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('rank-badge');
    });

    it('should contain resolution summary', () => {
      const html = generateDuprLadderHtml(players10);

      expect(html).toContain('players resolved');
      expect(html).toContain('summary-card');
    });

    it('should handle empty player list', () => {
      const html = generateDuprLadderHtml([]);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('DUPR Ladder');
      expect(html).not.toContain('POOL A');
    });

    it('should escape HTML special characters in player names', () => {
      const player = createPlayer('Player <script>alert("XSS")</script>', 4.0);
      const html = generateDuprLadderHtml([player]);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  // =============================================================================
  // generatePartnerDuprHtml Tests
  // =============================================================================

  describe('generatePartnerDuprHtml', () => {
    const createTeams = (): TeamWithRatings[] => [
      createTeamWithRatings(createPlayer('Alice', 4.2), createPlayer('Bob', 3.8)),
      createTeamWithRatings(createPlayer('Carol', 4.0), createPlayer('Dave', 3.5)),
      createTeamWithRatings(createPlayer('Eve', 3.8), createPlayer('Frank', 3.2)),
    ];

    it('should generate valid HTML structure', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should contain page title', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('Partner DUPR');
      expect(html).toContain('<title>Partner DUPR Results</title>');
    });

    it('should contain team ratings', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('Team Rating');
      expect(html).toContain('team-dupr');
    });

    it('should sort teams by team rating (highest first)', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      // Find positions of team ratings in the HTML
      const aliceTeamPos = html.indexOf('Alice');
      const carolTeamPos = html.indexOf('Carol');
      const eveTeamPos = html.indexOf('Eve');

      // Alice/Bob team has highest rating, should appear first
      expect(aliceTeamPos).toBeLessThan(carolTeamPos);
      expect(carolTeamPos).toBeLessThan(eveTeamPos);
    });

    it('should show both player names', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('Alice');
      expect(html).toContain('Bob');
      expect(html).toContain('Carol');
      expect(html).toContain('Dave');
    });

    it('should show individual player ratings', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('individual-ratings');
      expect(html).toContain('4.20'); // Alice
      expect(html).toContain('3.80'); // Bob
    });

    it('should contain team count in header', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('3 Teams');
    });

    it('should contain players resolved count', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('6/6 players resolved');
    });

    it('should apply team tier classes', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      // Check for tier classes
      expect(html).toMatch(/tier-(highest|high|mid|low)/);
    });

    it('should contain table structure', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('<table class="partner-dupr-table">');
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('</table>');
    });

    it('should handle teams with unfound players', () => {
      const teams = [
        createTeamWithRatings(
          createPlayer('Found', 4.0, true),
          createPlayer('Unknown', 3.0, false)
        ),
      ];
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('not-found');
      expect(html).toContain('1/2 players resolved');
    });

    it('should handle empty teams array', () => {
      const html = generatePartnerDuprHtml([]);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Partner DUPR');
      expect(html).toContain('0 Teams');
    });

    it('should include team rank numbers', () => {
      const teams = createTeams();
      const html = generatePartnerDuprHtml(teams);

      expect(html).toContain('team-rank');
    });
  });

  // =============================================================================
  // generatePickleBrosMondayHtml Tests
  // =============================================================================

  describe('generatePickleBrosMondayHtml', () => {
    it('should generate valid HTML structure', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should contain page title', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('PickleBros Monday');
      expect(html).toContain('<title>PickleBros Monday Results</title>');
    });

    it('should contain pool headers A, B, C...', () => {
      const players12 = Array.from({ length: 12 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const html = generatePickleBrosMondayHtml(players12);

      expect(html).toContain('POOL A');
      expect(html).toContain('POOL B');
      expect(html).toContain('POOL C');
    });

    it('should show exactly 4 players per pool', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('(4 players)');
    });

    it('should throw error for invalid player count (5 players)', () => {
      const players5 = players10.slice(0, 5);

      expect(() => generatePickleBrosMondayHtml(players5)).toThrow();
    });

    it('should throw error for invalid player count (7 players)', () => {
      const players7 = players10.slice(0, 7);

      expect(() => generatePickleBrosMondayHtml(players7)).toThrow();
    });

    it('should include Fixed 4-Player Pools subtitle', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('Fixed 4-Player Pools');
    });

    it('should contain all player names', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      players8.forEach((player) => {
        expect(html).toContain(player.name);
      });
    });

    it('should contain rating tier classes', () => {
      const players8 = players10.slice(0, 8);
      const html = generatePickleBrosMondayHtml(players8);

      expect(html).toContain('rating-high');
      expect(html).toContain('rating-mid');
    });

    it('should handle unfound players', () => {
      const players = [
        createPlayer('P1', 4.0),
        createPlayer('P2', 3.5),
        createPlayer('P3', 3.0, false),
        createPlayer('P4', 2.5),
      ];
      const html = generatePickleBrosMondayHtml(players);

      expect(html).toContain('not-found');
      expect(html).toContain('3/4 players resolved');
    });
  });

  // =============================================================================
  // createTeamWithRatings Tests
  // =============================================================================

  describe('createTeamWithRatings', () => {
    it('should calculate team rating correctly (35% higher + 65% lower)', () => {
      const p1 = createPlayer('Player 1', 4.25);
      const p2 = createPlayer('Player 2', 3.75);
      const team = createTeamWithRatings(p1, p2);

      // 0.35 * 4.25 + 0.65 * 3.75 = 1.4875 + 2.4375 = 3.925
      expect(team.teamRating).toBeCloseTo(3.925, 3);
    });

    it('should include both players in the team', () => {
      const p1 = createPlayer('Alice', 4.0);
      const p2 = createPlayer('Bob', 3.5);
      const team = createTeamWithRatings(p1, p2);

      expect(team.player1.name).toBe('Alice');
      expect(team.player2.name).toBe('Bob');
    });

    it('should handle equal ratings', () => {
      const p1 = createPlayer('Player 1', 3.5);
      const p2 = createPlayer('Player 2', 3.5);
      const team = createTeamWithRatings(p1, p2);

      // 0.35 * 3.5 + 0.65 * 3.5 = 3.5
      expect(team.teamRating).toBe(3.5);
    });

    it('should handle p1 lower than p2', () => {
      const p1 = createPlayer('Lower', 3.0);
      const p2 = createPlayer('Higher', 4.0);
      const team = createTeamWithRatings(p1, p2);

      // 0.35 * 4.0 + 0.65 * 3.0 = 1.4 + 1.95 = 3.35
      expect(team.teamRating).toBe(3.35);
    });

    it('should round to 3 decimal places', () => {
      const p1 = createPlayer('P1', 4.123);
      const p2 = createPlayer('P2', 3.456);
      const team = createTeamWithRatings(p1, p2);

      const decimalPlaces = team.teamRating.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(3);
    });

    it('should handle extreme rating differences', () => {
      const p1 = createPlayer('P1', 5.0);
      const p2 = createPlayer('P2', 2.0);
      const team = createTeamWithRatings(p1, p2);

      // 0.35 * 5.0 + 0.65 * 2.0 = 1.75 + 1.3 = 3.05
      expect(team.teamRating).toBe(3.05);
    });
  });

  // =============================================================================
  // Type Exports Tests
  // =============================================================================

  describe('type exports', () => {
    it('should export PlayerWithRating type', () => {
      const player: PlayerWithRating = {
        name: 'Test',
        rating: 3.5,
        profileUrl: null,
        found: true,
        searchMethod: 'exact',
      };
      expect(player).toBeDefined();
    });

    it('should export TeamWithRatings type', () => {
      const team: TeamWithRatings = {
        player1: createPlayer('P1', 4.0),
        player2: createPlayer('P2', 3.5),
        teamRating: 3.675,
      };
      expect(team).toBeDefined();
    });

    it('should export PlayerPool type', () => {
      const pool: PlayerPool = {
        name: 'A',
        players: [createPlayer('P1', 4.0)],
      };
      expect(pool).toBeDefined();
    });
  });

  // =============================================================================
  // Snapshot Tests
  // =============================================================================

  describe('snapshots', () => {
    // Helper to normalize timestamps in HTML for consistent snapshots
    const normalizeTimestamp = (html: string): string => {
      return html
        .replace(/\w+ \d{1,2}, \d{4}/g, '[DATE]')
        .replace(/Generated:.*?<\/p>/g, 'Generated: [TIMESTAMP]</p>');
    };

    it('should match ladder HTML snapshot', () => {
      const players = [
        createPlayer('John Smith', 4.25),
        createPlayer('Jane Doe', 3.75),
        createPlayer('Bob Wilson', 3.25),
        createPlayer('Alice Brown', 2.75),
      ];
      const html = generateDuprLadderHtml(players);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });

    it('should match partner HTML snapshot', () => {
      const teams = [
        createTeamWithRatings(createPlayer('Alice', 4.0), createPlayer('Bob', 3.5)),
        createTeamWithRatings(createPlayer('Carol', 3.8), createPlayer('Dave', 3.2)),
      ];
      const html = generatePartnerDuprHtml(teams);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });

    it('should match picklebros HTML snapshot', () => {
      const players = Array.from({ length: 8 }, (_, i) =>
        createPlayer(`Player ${i + 1}`, 4.0 - i * 0.1)
      );
      const html = generatePickleBrosMondayHtml(players);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });

    it('should match ladder HTML snapshot with unfound players', () => {
      const players = [
        createPlayer('Found Player', 4.0, true),
        createPlayer('Unknown Player', 3.0, false),
        createPlayer('Another Found', 3.5, true),
        createPlayer('Missing Person', 2.5, false),
      ];
      const html = generateDuprLadderHtml(players);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });

    it('should match partner HTML snapshot with mixed found/unfound', () => {
      const teams = [
        createTeamWithRatings(
          createPlayer('Found A', 4.0, true),
          createPlayer('Unknown B', 3.5, false)
        ),
      ];
      const html = generatePartnerDuprHtml(teams);

      expect(normalizeTimestamp(html)).toMatchSnapshot();
    });
  });
});
