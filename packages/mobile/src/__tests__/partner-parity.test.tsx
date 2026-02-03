/**
 * Partner DUPR Parity Tests
 * Tests GameService.processPartner against Phase 0 fixtures
 * Verifies team rating formula: 35% higher + 65% lower
 */

import { GameService } from '../services/gameService';
import { calculateTeamRating } from '@dupr/core';

// Load fixtures
import partnerBasic from '../../../core/tests/fixtures/partner_basic.json';
import partner5Teams from '../../../core/tests/fixtures/partner_5teams.json';
import partnerNotFound from '../../../core/tests/fixtures/partner_not_found.json';
import partnerEdgeCases from '../../../core/tests/fixtures/partner_edge_cases.json';

// Mock overrideStorage
jest.mock('../services/overrideStorage', () => ({
  getOverrides: jest.fn().mockResolvedValue([]),
  saveOverride: jest.fn(),
  deleteOverride: jest.fn(),
  clearOverrides: jest.fn(),
}));

// Create a mock searcher instance
const mockSearcher = {
  searchPlayers: jest.fn().mockResolvedValue([]),
  searchPlayer: jest.fn(),
};

// Mock the DUPRClient
jest.mock('@dupr/core', () => {
  const actual = jest.requireActual('@dupr/core');
  return {
    ...actual,
    DUPRClient: jest.fn().mockImplementation(() => ({
      searchPlayers: jest.fn().mockResolvedValue([]),
    })),
    PlayerSearcher: jest.fn().mockImplementation(() => mockSearcher),
  };
});

describe('Partner DUPR Parity Tests', () => {
  describe('partner_basic.json - Basic 2-team fixture', () => {
    it('should produce correct team ratings for basic 2-team input', async () => {
      const service = new GameService('mock-token');
      const fixture = partnerBasic as any;

      // Mock the searcher to return fixture data
      const mockResults = [];
      for (const team of fixture.teams) {
        mockResults.push({
          name: team.player1.name,
          rating: team.player1.rating,
          playerId: null,
          duprId: team.player1.dupr_id,
          duprName: team.player1.name,
          profileUrl: `https://dupr.com/player/${team.player1.dupr_id}`,
          found: team.player1.found,
          searchMethod: 'mock',
          location: 'Mock Location',
        });
        mockResults.push({
          name: team.player2.name,
          rating: team.player2.rating,
          playerId: null,
          duprId: team.player2.dupr_id,
          duprName: team.player2.name,
          profileUrl: `https://dupr.com/player/${team.player2.dupr_id}`,
          found: team.player2.found,
          searchMethod: 'mock',
          location: 'Mock Location',
        });
      }

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = fixture.input.join('\n');
      const result = await service.processPartner(input);

      // Verify teams count
      expect(result.teams).toBeDefined();
      expect(result.teams).toHaveLength(fixture.teams.length);

      // Verify team ratings
      for (let i = 0; i < fixture.teams.length; i++) {
        const expectedTeam = fixture.teams[i];
        const actualTeam = result.teams![i];

        expect(actualTeam.player1.name).toBe(expectedTeam.player1.name);
        expect(actualTeam.player2.name).toBe(expectedTeam.player2.name);
        expect(actualTeam.player1.rating).toBe(expectedTeam.player1.rating);
        expect(actualTeam.player2.rating).toBe(expectedTeam.player2.rating);

        // Verify team rating formula: 35% higher + 65% lower
        const expectedTeamRating = calculateTeamRating(
          expectedTeam.player1.rating,
          expectedTeam.player2.rating
        );
        expect(actualTeam.teamRating).toBeCloseTo(expectedTeamRating, 2);
        // Use the calculated rating from the core function, not fixture value
        expect(actualTeam.teamRating).toBe(expectedTeamRating);
      }

      // Verify HTML generation
      expect(result.html).toBeTruthy();
      expect(result.html).toContain('Partner DUPR');
    });
  });

  describe('partner_5teams.json - Realistic 5-team fixture', () => {
    it('should produce correct team ratings for 5-team input', async () => {
      const service = new GameService('mock-token');
      const fixture = partner5Teams as any;

      // Mock the searcher to return fixture data
      const mockResults = [];
      for (const team of fixture.teams) {
        mockResults.push({
          name: team.player1.name,
          rating: team.player1.rating,
          playerId: null,
          duprId: team.player1.dupr_id,
          duprName: team.player1.name,
          profileUrl: `https://dupr.com/player/${team.player1.dupr_id}`,
          found: team.player1.found,
          searchMethod: 'mock',
          location: 'Mock Location',
        });
        mockResults.push({
          name: team.player2.name,
          rating: team.player2.rating,
          playerId: null,
          duprId: team.player2.dupr_id,
          duprName: team.player2.name,
          profileUrl: `https://dupr.com/player/${team.player2.dupr_id}`,
          found: team.player2.found,
          searchMethod: 'mock',
          location: 'Mock Location',
        });
      }

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = fixture.input.join('\n');
      const result = await service.processPartner(input);

      // Verify teams count
      expect(result.teams).toBeDefined();
      expect(result.teams).toHaveLength(5);

      // Verify each team's rating
      for (let i = 0; i < fixture.teams.length; i++) {
        const expectedTeam = fixture.teams[i];
        const actualTeam = result.teams![i];

        // Verify team rating calculation
        const calculatedRating = calculateTeamRating(
          expectedTeam.player1.rating,
          expectedTeam.player2.rating
        );
        expect(actualTeam.teamRating).toBeCloseTo(calculatedRating, 3);
        expect(actualTeam.teamRating).toBeCloseTo(expectedTeam.team_rating, 3);
      }

      // Verify HTML generation
      expect(result.html).toContain('Partner DUPR');
    });

    it('should verify team rating formula: 35% higher + 65% lower', () => {
      const fixture = partner5Teams as any;

      // Test Team 1: Player A (4.80) + Player B (4.20)
      const team1Rating = calculateTeamRating(4.8, 4.2);
      expect(team1Rating).toBeCloseTo(4.41, 3);
      expect(team1Rating).toBe(fixture.teams[0].team_rating);

      // Test Team 2: Player C (4.50) + Player D (3.80)
      const team2Rating = calculateTeamRating(4.5, 3.8);
      expect(team2Rating).toBeCloseTo(4.045, 3);
      expect(team2Rating).toBe(fixture.teams[1].team_rating);

      // Test Team 3: Player E (4.00) + Player F (3.60)
      const team3Rating = calculateTeamRating(4.0, 3.6);
      expect(team3Rating).toBeCloseTo(3.74, 3);
      expect(team3Rating).toBe(fixture.teams[2].team_rating);

      // Test Team 4: Player G (3.50) + Player H (3.20)
      const team4Rating = calculateTeamRating(3.5, 3.2);
      expect(team4Rating).toBeCloseTo(3.305, 3);
      expect(team4Rating).toBe(fixture.teams[3].team_rating);

      // Test Team 5: Player I (3.00) + Player J (2.80)
      const team5Rating = calculateTeamRating(3.0, 2.8);
      expect(team5Rating).toBeCloseTo(2.87, 3);
      expect(team5Rating).toBe(fixture.teams[4].team_rating);
    });
  });

  describe('partner_not_found.json - Players not found fixture', () => {
    it('should handle players not found with default rating 3.0', async () => {
      const service = new GameService('mock-token');
      const fixture = partnerNotFound as any;

      // Mock the searcher to return fixture data with not found players
      const mockResults = [];
      for (const team of fixture.teams) {
        mockResults.push({
          name: team.player1.name,
          rating: team.player1.rating,
          playerId: null,
          duprId: team.player1.dupr_id,
          duprName: team.player1.name,
          profileUrl: team.player1.found ? `https://dupr.com/player/${team.player1.dupr_id}` : null,
          found: team.player1.found,
          searchMethod: team.player1.found ? 'mock' : 'not_found',
          location: team.player1.found ? 'Mock Location' : null,
        });
        mockResults.push({
          name: team.player2.name,
          rating: team.player2.rating,
          playerId: null,
          duprId: team.player2.dupr_id,
          duprName: team.player2.name,
          profileUrl: team.player2.found ? `https://dupr.com/player/${team.player2.dupr_id}` : null,
          found: team.player2.found,
          searchMethod: team.player2.found ? 'mock' : 'not_found',
          location: team.player2.found ? 'Mock Location' : null,
        });
      }

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = fixture.input.join('\n');
      const result = await service.processPartner(input);

      // Verify teams count
      expect(result.teams).toBeDefined();
      expect(result.teams).toHaveLength(3);

      // Team 1: Known Player (4.50) + Unknown Guest (3.0 default)
      const team1 = result.teams![0];
      expect(team1.player1.rating).toBe(4.5);
      expect(team1.player2.rating).toBe(3.0);
      expect(team1.teamRating).toBeCloseTo(3.525, 3);

      // Team 2: Both not found (3.0 default each)
      const team2 = result.teams![1];
      expect(team2.player1.rating).toBe(3.0);
      expect(team2.player2.rating).toBe(3.0);
      expect(team2.teamRating).toBeCloseTo(3.0, 3);

      // Team 3: Both found
      const team3 = result.teams![2];
      expect(team3.player1.rating).toBe(3.8);
      expect(team3.player2.rating).toBe(3.5);
      expect(team3.teamRating).toBeCloseTo(3.605, 3);
    });
  });

  describe('partner_edge_cases.json - Edge cases fixture', () => {
    it('should handle whitespace around delimiter and names', async () => {
      const service = new GameService('mock-token');
      const fixture = partnerEdgeCases as any;

      // Mock the searcher to return fixture data
      // Note: parsePartnerDuprTeams trims outer whitespace but preserves internal spaces
      // So "Charlie   Brown" from input becomes "Charlie   Brown" after parsing
      const mockResults = [];

      // Build mock results based on what the parser will extract
      // Team 1: "  John Smith  /  Jane Doe  " -> "John Smith" / "Jane Doe"
      mockResults.push({
        name: 'John Smith',
        rating: 4.00,
        playerId: null,
        duprId: 'JS001',
        duprName: 'John Smith',
        profileUrl: 'https://dupr.com/player/JS001',
        found: true,
        searchMethod: 'mock',
        location: 'Mock Location',
      });
      mockResults.push({
        name: 'Jane Doe',
        rating: 3.50,
        playerId: null,
        duprId: 'JD002',
        duprName: 'Jane Doe',
        profileUrl: 'https://dupr.com/player/JD002',
        found: true,
        searchMethod: 'mock',
        location: 'Mock Location',
      });

      // Team 2: "Bob Johnson/Alice Anderson"
      mockResults.push({
        name: 'Bob Johnson',
        rating: 3.80,
        playerId: null,
        duprId: 'BJ003',
        duprName: 'Bob Johnson',
        profileUrl: 'https://dupr.com/player/BJ003',
        found: true,
        searchMethod: 'mock',
        location: 'Mock Location',
      });
      mockResults.push({
        name: 'Alice Anderson',
        rating: 3.20,
        playerId: null,
        duprId: 'AA004',
        duprName: 'Alice Anderson',
        profileUrl: 'https://dupr.com/player/AA004',
        found: true,
        searchMethod: 'mock',
        location: 'Mock Location',
      });

      // Team 3: "Charlie   Brown / Diana    Prince" -> "Charlie   Brown" / "Diana    Prince"
      // Parser trims outer spaces but keeps internal multiple spaces
      mockResults.push({
        name: 'Charlie   Brown',
        rating: 3.60,
        playerId: null,
        duprId: 'CB005',
        duprName: 'Charlie Brown',
        profileUrl: 'https://dupr.com/player/CB005',
        found: true,
        searchMethod: 'mock',
        location: 'Mock Location',
      });
      mockResults.push({
        name: 'Diana    Prince',
        rating: 3.40,
        playerId: null,
        duprId: 'DP006',
        duprName: 'Diana Prince',
        profileUrl: 'https://dupr.com/player/DP006',
        found: true,
        searchMethod: 'mock',
        location: 'Mock Location',
      });

      // Team 4: "Equal Rating A / Equal Rating B"
      mockResults.push({
        name: 'Equal Rating A',
        rating: 3.50,
        playerId: null,
        duprId: 'ERA007',
        duprName: 'Equal Rating A',
        profileUrl: 'https://dupr.com/player/ERA007',
        found: true,
        searchMethod: 'mock',
        location: 'Mock Location',
      });
      mockResults.push({
        name: 'Equal Rating B',
        rating: 3.50,
        playerId: null,
        duprId: 'ERB008',
        duprName: 'Equal Rating B',
        profileUrl: 'https://dupr.com/player/ERB008',
        found: true,
        searchMethod: 'mock',
        location: 'Mock Location',
      });

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = fixture.input.join('\n');
      const result = await service.processPartner(input);

      // Verify teams count
      expect(result.teams).toBeDefined();
      expect(result.teams).toHaveLength(4);

      // Team 1: Whitespace trimming test
      const team1 = result.teams![0];
      expect(team1.player1.name).toBe('John Smith');
      expect(team1.player2.name).toBe('Jane Doe');
      expect(team1.teamRating).toBeCloseTo(3.675, 2);

      // Team 2: No space around delimiter
      const team2 = result.teams![1];
      expect(team2.player1.name).toBe('Bob Johnson');
      expect(team2.player2.name).toBe('Alice Anderson');
      expect(team2.teamRating).toBeCloseTo(3.41, 2);

      // Team 3: Internal whitespace preserved (as parsed)
      const team3 = result.teams![2];
      expect(team3.player1.name).toBe('Charlie   Brown');
      expect(team3.player2.name).toBe('Diana    Prince');
      expect(team3.teamRating).toBeCloseTo(3.47, 2);

      // Team 4: Equal ratings
      const team4 = result.teams![3];
      expect(team4.player1.rating).toBe(3.5);
      expect(team4.player2.rating).toBe(3.5);
      expect(team4.teamRating).toBeCloseTo(3.5, 2);
    });

    it('should verify equal ratings result in same team rating', () => {
      // When both players have same rating, team rating should equal that rating
      const equalRating = calculateTeamRating(3.5, 3.5);
      expect(equalRating).toBe(3.5);
    });
  });

  describe('Team Rating Formula Verification', () => {
    it('should calculate team rating as 35% higher + 65% lower', () => {
      // Test case 1: 4.25 and 3.75
      const rating1 = calculateTeamRating(4.25, 3.75);
      const expected1 = 0.35 * 4.25 + 0.65 * 3.75;
      expect(rating1).toBeCloseTo(expected1, 3);
      expect(rating1).toBeCloseTo(3.925, 3);

      // Test case 2: 3.50 and 3.25
      const rating2 = calculateTeamRating(3.5, 3.25);
      const expected2 = 0.35 * 3.5 + 0.65 * 3.25;
      expect(rating2).toBeCloseTo(expected2, 3);
      // Actual calculation: (0.35 * 3.5) + (0.65 * 3.25) = 1.225 + 2.1125 = 3.3375 -> rounds to 3.338
      expect(rating2).toBe(3.338);

      // Test case 3: Large difference (4.80 and 2.80)
      const rating3 = calculateTeamRating(4.8, 2.8);
      const expected3 = 0.35 * 4.8 + 0.65 * 2.8;
      expect(rating3).toBeCloseTo(expected3, 3);
      expect(rating3).toBeCloseTo(3.5, 3);
    });

    it('should handle order-independent calculation', () => {
      // Team rating should be the same regardless of which player is entered first
      const rating1 = calculateTeamRating(4.5, 3.5);
      const rating2 = calculateTeamRating(3.5, 4.5);
      expect(rating1).toBe(rating2);
    });
  });
});
