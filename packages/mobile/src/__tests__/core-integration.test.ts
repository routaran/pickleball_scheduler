/**
 * Integration test to verify @dupr/core imports work in mobile package
 */
import {
  GameType,
  parseDuprLadderPlayers,
  parsePartnerDuprTeams,
  calculateTeamRating
} from '@dupr/core';

describe('@dupr/core integration', () => {
  it('should import GameType enum', () => {
    expect(GameType.DUPR_LADDER).toBe('dupr_ladder');
    expect(GameType.PARTNER_DUPR).toBe('partner_dupr');
    expect(GameType.PICKLEBROS_MONDAY).toBe('picklebros_monday');
  });

  it('should import and use parseDuprLadderPlayers', () => {
    const input = 'John Smith\nJane Doe\nBob Johnson';
    const players = parseDuprLadderPlayers(input);
    expect(players).toEqual(['John Smith', 'Jane Doe', 'Bob Johnson']);
  });

  it('should import and use parsePartnerDuprTeams', () => {
    const input = 'John Smith / Jane Doe\nBob Johnson / Alice Brown';
    const teams = parsePartnerDuprTeams(input);
    expect(teams).toHaveLength(2);
    expect(teams[0]).toEqual({ player1: 'John Smith', player2: 'Jane Doe' });
  });

  it('should import and use calculateTeamRating', () => {
    const teamRating = calculateTeamRating(4.5, 3.5);
    // 35% of 4.5 + 65% of 3.5 = 1.575 + 2.275 = 3.85
    expect(teamRating).toBe(3.85);
  });
});
