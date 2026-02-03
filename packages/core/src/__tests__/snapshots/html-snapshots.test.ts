/**
 * HTML Generator Snapshot Tests
 * Tests that HTML outputs remain consistent across changes
 */

import {
  generateDuprLadderHtml,
  generatePartnerDuprHtml,
  generatePickleBrosMondayHtml,
  createTeamWithRatings,
  PlayerWithRating,
  TeamWithRatings,
} from '../../html-generator';

describe('HTML Generator Snapshots', () => {
  describe('DUPR Ladder HTML', () => {
    it('should match ladder HTML snapshot with basic players', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'John Smith',
          rating: 4.2,
          profileUrl: 'https://dupr.com/john-smith',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Jane Doe',
          rating: 3.5,
          profileUrl: 'https://dupr.com/jane-doe',
          found: true,
          searchMethod: 'fuzzy',
        },
        {
          name: 'Bob Wilson',
          rating: 3.8,
          profileUrl: 'https://dupr.com/bob-wilson',
          found: true,
          searchMethod: 'exact',
        },
      ];

      const html = generateDuprLadderHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match ladder HTML snapshot with high-rated players', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'Pro Player 1',
          rating: 5.0,
          profileUrl: 'https://dupr.com/pro-1',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Pro Player 2',
          rating: 4.8,
          profileUrl: 'https://dupr.com/pro-2',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Advanced Player',
          rating: 4.3,
          profileUrl: 'https://dupr.com/advanced',
          found: true,
          searchMethod: 'exact',
        },
      ];

      const html = generateDuprLadderHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match ladder HTML snapshot with low-rated players', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'Beginner 1',
          rating: 2.5,
          profileUrl: 'https://dupr.com/beginner-1',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Beginner 2',
          rating: 2.8,
          profileUrl: 'https://dupr.com/beginner-2',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Novice Player',
          rating: 2.2,
          profileUrl: 'https://dupr.com/novice',
          found: true,
          searchMethod: 'exact',
        },
      ];

      const html = generateDuprLadderHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match ladder HTML snapshot with mixed found/unfound players', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'Found Player',
          rating: 4.0,
          profileUrl: 'https://dupr.com/found',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Not Found Player',
          rating: 3.0,
          profileUrl: null,
          found: false,
          searchMethod: 'default',
        },
        {
          name: 'Another Found',
          rating: 3.7,
          profileUrl: 'https://dupr.com/another',
          found: true,
          searchMethod: 'fuzzy',
        },
      ];

      const html = generateDuprLadderHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match ladder HTML snapshot with large player list (10 players)', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'Player 1',
          rating: 4.5,
          profileUrl: 'https://dupr.com/p1',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 2',
          rating: 4.3,
          profileUrl: 'https://dupr.com/p2',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 3',
          rating: 4.1,
          profileUrl: 'https://dupr.com/p3',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 4',
          rating: 3.9,
          profileUrl: 'https://dupr.com/p4',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 5',
          rating: 3.7,
          profileUrl: 'https://dupr.com/p5',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 6',
          rating: 3.5,
          profileUrl: 'https://dupr.com/p6',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 7',
          rating: 3.3,
          profileUrl: 'https://dupr.com/p7',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 8',
          rating: 3.1,
          profileUrl: 'https://dupr.com/p8',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 9',
          rating: 2.9,
          profileUrl: 'https://dupr.com/p9',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 10',
          rating: 2.7,
          profileUrl: 'https://dupr.com/p10',
          found: true,
          searchMethod: 'exact',
        },
      ];

      const html = generateDuprLadderHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match ladder HTML snapshot with empty list', () => {
      const mockPlayers: PlayerWithRating[] = [];
      const html = generateDuprLadderHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match ladder HTML snapshot with special characters in names', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: "O'Brien, John",
          rating: 4.0,
          profileUrl: 'https://dupr.com/obrien',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'José García',
          rating: 3.8,
          profileUrl: 'https://dupr.com/garcia',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Müller, Hans',
          rating: 3.5,
          profileUrl: 'https://dupr.com/muller',
          found: true,
          searchMethod: 'exact',
        },
      ];

      const html = generateDuprLadderHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });
  });

  describe('Partner DUPR HTML', () => {
    it('should match partner HTML snapshot with basic teams', () => {
      const player1: PlayerWithRating = {
        name: 'John Smith',
        rating: 4.25,
        profileUrl: 'https://dupr.com/john',
        found: true,
        searchMethod: 'exact',
      };

      const player2: PlayerWithRating = {
        name: 'Jane Doe',
        rating: 3.75,
        profileUrl: 'https://dupr.com/jane',
        found: true,
        searchMethod: 'exact',
      };

      const player3: PlayerWithRating = {
        name: 'Bob Wilson',
        rating: 3.50,
        profileUrl: 'https://dupr.com/bob',
        found: true,
        searchMethod: 'exact',
      };

      const player4: PlayerWithRating = {
        name: 'Alice Brown',
        rating: 3.25,
        profileUrl: 'https://dupr.com/alice',
        found: true,
        searchMethod: 'exact',
      };

      const teams: TeamWithRatings[] = [
        createTeamWithRatings(player1, player2),
        createTeamWithRatings(player3, player4),
      ];

      const html = generatePartnerDuprHtml(teams);
      expect(html).toMatchSnapshot();
    });

    it('should match partner HTML snapshot with high-rated teams', () => {
      const player1: PlayerWithRating = {
        name: 'Pro 1',
        rating: 5.0,
        profileUrl: 'https://dupr.com/pro1',
        found: true,
        searchMethod: 'exact',
      };

      const player2: PlayerWithRating = {
        name: 'Pro 2',
        rating: 4.8,
        profileUrl: 'https://dupr.com/pro2',
        found: true,
        searchMethod: 'exact',
      };

      const teams: TeamWithRatings[] = [createTeamWithRatings(player1, player2)];

      const html = generatePartnerDuprHtml(teams);
      expect(html).toMatchSnapshot();
    });

    it('should match partner HTML snapshot with mixed found/unfound', () => {
      const found: PlayerWithRating = {
        name: 'Found Player',
        rating: 4.0,
        profileUrl: 'https://dupr.com/found',
        found: true,
        searchMethod: 'exact',
      };

      const notFound: PlayerWithRating = {
        name: 'Not Found Player',
        rating: 3.0,
        profileUrl: null,
        found: false,
        searchMethod: 'default',
      };

      const teams: TeamWithRatings[] = [createTeamWithRatings(found, notFound)];

      const html = generatePartnerDuprHtml(teams);
      expect(html).toMatchSnapshot();
    });

    it('should match partner HTML snapshot with multiple teams (5 teams)', () => {
      const createPlayer = (name: string, rating: number, id: number): PlayerWithRating => ({
        name,
        rating,
        profileUrl: `https://dupr.com/${name.replace(' ', '-').toLowerCase()}`,
        found: true,
        searchMethod: 'exact',
      });

      const teams: TeamWithRatings[] = [
        createTeamWithRatings(createPlayer('Player 1', 4.5, 1), createPlayer('Player 2', 4.3, 2)),
        createTeamWithRatings(createPlayer('Player 3', 4.1, 3), createPlayer('Player 4', 3.9, 4)),
        createTeamWithRatings(createPlayer('Player 5', 3.8, 5), createPlayer('Player 6', 3.6, 6)),
        createTeamWithRatings(createPlayer('Player 7', 3.4, 7), createPlayer('Player 8', 3.2, 8)),
        createTeamWithRatings(
          createPlayer('Player 9', 3.0, 9),
          createPlayer('Player 10', 2.8, 10)
        ),
      ];

      const html = generatePartnerDuprHtml(teams);
      expect(html).toMatchSnapshot();
    });

    it('should match partner HTML snapshot with empty teams list', () => {
      const teams: TeamWithRatings[] = [];
      const html = generatePartnerDuprHtml(teams);
      expect(html).toMatchSnapshot();
    });

    it('should match partner HTML snapshot with equal ratings', () => {
      const player1: PlayerWithRating = {
        name: 'Player A',
        rating: 3.5,
        profileUrl: 'https://dupr.com/a',
        found: true,
        searchMethod: 'exact',
      };

      const player2: PlayerWithRating = {
        name: 'Player B',
        rating: 3.5,
        profileUrl: 'https://dupr.com/b',
        found: true,
        searchMethod: 'exact',
      };

      const teams: TeamWithRatings[] = [createTeamWithRatings(player1, player2)];

      const html = generatePartnerDuprHtml(teams);
      expect(html).toMatchSnapshot();
    });

    it('should match partner HTML snapshot with extreme rating differences', () => {
      const highRated: PlayerWithRating = {
        name: 'Expert',
        rating: 5.0,
        profileUrl: 'https://dupr.com/expert',
        found: true,
        searchMethod: 'exact',
      };

      const lowRated: PlayerWithRating = {
        name: 'Beginner',
        rating: 2.0,
        profileUrl: 'https://dupr.com/beginner',
        found: true,
        searchMethod: 'exact',
      };

      const teams: TeamWithRatings[] = [createTeamWithRatings(highRated, lowRated)];

      const html = generatePartnerDuprHtml(teams);
      expect(html).toMatchSnapshot();
    });
  });

  describe('PickleBros Monday HTML', () => {
    it('should match PickleBros HTML snapshot with 8 players', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'Player 1',
          rating: 4.5,
          profileUrl: 'https://dupr.com/p1',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 2',
          rating: 4.3,
          profileUrl: 'https://dupr.com/p2',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 3',
          rating: 4.1,
          profileUrl: 'https://dupr.com/p3',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 4',
          rating: 3.9,
          profileUrl: 'https://dupr.com/p4',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 5',
          rating: 3.7,
          profileUrl: 'https://dupr.com/p5',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 6',
          rating: 3.5,
          profileUrl: 'https://dupr.com/p6',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 7',
          rating: 3.3,
          profileUrl: 'https://dupr.com/p7',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 8',
          rating: 3.1,
          profileUrl: 'https://dupr.com/p8',
          found: true,
          searchMethod: 'exact',
        },
      ];

      const html = generatePickleBrosMondayHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match PickleBros HTML snapshot with 12 players', () => {
      const mockPlayers: PlayerWithRating[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 4.5 - i * 0.15,
        profileUrl: `https://dupr.com/p${i + 1}`,
        found: true,
        searchMethod: 'exact' as const,
      }));

      const html = generatePickleBrosMondayHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match PickleBros HTML snapshot with 4 players (minimum)', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'Player A',
          rating: 4.0,
          profileUrl: 'https://dupr.com/a',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player B',
          rating: 3.8,
          profileUrl: 'https://dupr.com/b',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player C',
          rating: 3.5,
          profileUrl: 'https://dupr.com/c',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player D',
          rating: 3.2,
          profileUrl: 'https://dupr.com/d',
          found: true,
          searchMethod: 'exact',
        },
      ];

      const html = generatePickleBrosMondayHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match PickleBros HTML snapshot with unfound players', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'Found 1',
          rating: 4.0,
          profileUrl: 'https://dupr.com/f1',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Not Found 1',
          rating: 3.0,
          profileUrl: null,
          found: false,
          searchMethod: 'default',
        },
        {
          name: 'Found 2',
          rating: 3.8,
          profileUrl: 'https://dupr.com/f2',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Not Found 2',
          rating: 3.0,
          profileUrl: null,
          found: false,
          searchMethod: 'default',
        },
      ];

      const html = generatePickleBrosMondayHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match PickleBros HTML snapshot with 16 players', () => {
      const mockPlayers: PlayerWithRating[] = Array.from({ length: 16 }, (_, i) => ({
        name: `Player ${String.fromCharCode(65 + i)}`,
        rating: 5.0 - i * 0.15,
        profileUrl: `https://dupr.com/player${i + 1}`,
        found: true,
        searchMethod: 'exact' as const,
      }));

      const html = generatePickleBrosMondayHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });

    it('should match PickleBros HTML snapshot with tied ratings', () => {
      const mockPlayers: PlayerWithRating[] = [
        {
          name: 'Player 1',
          rating: 3.5,
          profileUrl: 'https://dupr.com/p1',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 2',
          rating: 3.5,
          profileUrl: 'https://dupr.com/p2',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 3',
          rating: 3.5,
          profileUrl: 'https://dupr.com/p3',
          found: true,
          searchMethod: 'exact',
        },
        {
          name: 'Player 4',
          rating: 3.5,
          profileUrl: 'https://dupr.com/p4',
          found: true,
          searchMethod: 'exact',
        },
      ];

      const html = generatePickleBrosMondayHtml(mockPlayers);
      expect(html).toMatchSnapshot();
    });
  });

  describe('HTML Structure Validation', () => {
    it('should have valid HTML5 doctype in all formats', () => {
      const player: PlayerWithRating = {
        name: 'Test',
        rating: 3.5,
        profileUrl: 'url',
        found: true,
        searchMethod: 'exact',
      };

      const ladderHtml = generateDuprLadderHtml([player]);
      expect(ladderHtml).toContain('<!DOCTYPE html>');

      const partnerHtml = generatePartnerDuprHtml([createTeamWithRatings(player, player)]);
      expect(partnerHtml).toContain('<!DOCTYPE html>');

      const picklebrosHtml = generatePickleBrosMondayHtml([player, player, player, player]);
      expect(picklebrosHtml).toContain('<!DOCTYPE html>');
    });

    it('should contain CSS for print-friendly styling', () => {
      const player: PlayerWithRating = {
        name: 'Test',
        rating: 3.5,
        profileUrl: 'url',
        found: true,
        searchMethod: 'exact',
      };

      const html = generateDuprLadderHtml([player]);
      expect(html).toContain('@media print');
      expect(html).toContain('font-family');
      expect(html).toContain('.rating-high');
      expect(html).toContain('.rating-mid');
      expect(html).toContain('.rating-low');
    });

    it('should escape HTML special characters in player names', () => {
      const player: PlayerWithRating = {
        name: '<script>alert("xss")</script>',
        rating: 3.5,
        profileUrl: 'url',
        found: true,
        searchMethod: 'exact',
      };

      const html = generateDuprLadderHtml([player]);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });
});
