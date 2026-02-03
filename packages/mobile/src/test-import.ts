// Test file to verify @dupr/core imports work
import { GameType, parseDuprLadderPlayers } from '@dupr/core';

// This file verifies that imports from the core package work correctly
export function testImport() {
  const players = parseDuprLadderPlayers('John\nJane\nBob');
  console.log('Players:', players);
  console.log('GameType enum:', GameType.DUPR_LADDER);
  return players;
}
