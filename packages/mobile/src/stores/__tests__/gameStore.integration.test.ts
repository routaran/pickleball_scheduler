import { useGameStore } from '../gameStore';
import { GameType, parseDuprLadderPlayers, parsePartnerDuprTeams } from '@dupr/core';

describe('gameStore integration with @dupr/core', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('should work with GameType enum from @dupr/core', () => {
    const { setFormat } = useGameStore.getState();

    // Test all three game types
    setFormat(GameType.DUPR_LADDER);
    expect(useGameStore.getState().format).toBe(GameType.DUPR_LADDER);

    setFormat(GameType.PARTNER_DUPR);
    expect(useGameStore.getState().format).toBe(GameType.PARTNER_DUPR);

    setFormat(GameType.PICKLEBROS_MONDAY);
    expect(useGameStore.getState().format).toBe(GameType.PICKLEBROS_MONDAY);
  });

  it('should work with parseDuprLadderPlayers from @dupr/core', () => {
    const store = useGameStore.getState();

    // Set input text
    const inputText = 'John Doe\nJane Smith\nBob Johnson';
    store.setInputText(inputText);

    // Parse using @dupr/core function
    const playerNames = parseDuprLadderPlayers(inputText);

    // Store parsed players
    const players = playerNames.map((name) => ({ name }));
    store.setPlayers(players);

    // Verify
    const state = useGameStore.getState();
    expect(state.players).toHaveLength(3);
    expect(state.players[0].name).toBe('John Doe');
    expect(state.players[1].name).toBe('Jane Smith');
    expect(state.players[2].name).toBe('Bob Johnson');
  });

  it('should work with parsePartnerDuprTeams from @dupr/core', () => {
    const store = useGameStore.getState();

    // Set input text for partner format
    const inputText = 'John Doe / Jane Smith\nBob Johnson / Alice Williams';
    store.setInputText(inputText);

    // Parse using @dupr/core function
    const teams = parsePartnerDuprTeams(inputText);

    // Store parsed teams
    store.setTeams(teams);

    // Verify
    const state = useGameStore.getState();
    expect(state.teams).toHaveLength(2);
    expect(state.teams[0]).toEqual({ player1: 'John Doe', player2: 'Jane Smith' });
    expect(state.teams[1]).toEqual({ player1: 'Bob Johnson', player2: 'Alice Williams' });
  });

  it('should simulate complete game flow with DUPR Ladder', () => {
    const store = useGameStore.getState();

    // Step 1: User selects format
    store.setFormat(GameType.DUPR_LADDER);

    // Step 2: User enters player names
    const inputText = 'John Doe\nJane Smith\nBob Johnson';
    store.setInputText(inputText);

    // Step 3: Parse player names
    const playerNames = parseDuprLadderPlayers(inputText);
    store.setPlayers(playerNames.map((name) => ({ name })));

    // Step 4: Simulate processing
    store.setProcessing(true);

    // Step 5: Simulate API results
    store.setProcessing(false);
    store.setResults({
      players: [
        {
          name: 'John Doe',
          rating: 4.5,
          found: true,
          profileUrl: 'https://mydupr.com/player/123',
          searchMethod: 'exact',
        },
        {
          name: 'Jane Smith',
          rating: 3.8,
          found: true,
          profileUrl: 'https://mydupr.com/player/456',
          searchMethod: 'fuzzy',
        },
        {
          name: 'Bob Johnson',
          rating: 3.2,
          found: true,
          profileUrl: 'https://mydupr.com/player/789',
          searchMethod: 'exact',
        },
      ],
      pools: [
        {
          name: 'A',
          players: [
            { name: 'John Doe', rating: 4.5 },
            { name: 'Jane Smith', rating: 3.8 },
          ],
        },
        {
          name: 'B',
          players: [{ name: 'Bob Johnson', rating: 3.2 }],
        },
      ],
    });

    // Step 6: Simulate HTML generation
    store.setHtml('<html><body>Generated Report</body></html>');

    // Verify final state
    const state = useGameStore.getState();
    expect(state.format).toBe(GameType.DUPR_LADDER);
    expect(state.inputText).toBe(inputText);
    expect(state.players).toHaveLength(3);
    expect(state.isProcessing).toBe(false);
    expect(state.results).toBeDefined();
    expect(state.results?.players).toHaveLength(3);
    expect(state.results?.pools).toHaveLength(2);
    expect(state.html).toBeTruthy();
    expect(state.error).toBeNull();
  });

  it('should simulate complete game flow with Partner DUPR', () => {
    const store = useGameStore.getState();

    // Step 1: User selects format
    store.setFormat(GameType.PARTNER_DUPR);

    // Step 2: User enters team pairs
    const inputText = 'John Doe / Jane Smith\nBob Johnson / Alice Williams';
    store.setInputText(inputText);

    // Step 3: Parse teams
    const teams = parsePartnerDuprTeams(inputText);
    store.setTeams(teams);

    // Step 4: Simulate processing
    store.setProcessing(true);

    // Step 5: Simulate API results with team ratings
    store.setProcessing(false);
    store.setResults({
      players: [
        {
          name: 'John Doe',
          rating: 4.5,
          found: true,
          profileUrl: 'https://mydupr.com/player/123',
          searchMethod: 'exact',
        },
        {
          name: 'Jane Smith',
          rating: 3.8,
          found: true,
          profileUrl: 'https://mydupr.com/player/456',
          searchMethod: 'exact',
        },
        {
          name: 'Bob Johnson',
          rating: 3.2,
          found: true,
          profileUrl: 'https://mydupr.com/player/789',
          searchMethod: 'exact',
        },
        {
          name: 'Alice Williams',
          rating: 4.0,
          found: true,
          profileUrl: 'https://mydupr.com/player/012',
          searchMethod: 'exact',
        },
      ],
      teams: [
        { player1: 'John Doe', player2: 'Jane Smith', teamRating: 4.035 },
        { player1: 'Bob Johnson', player2: 'Alice Williams', teamRating: 3.48 },
      ],
    });

    // Step 6: Simulate HTML generation
    store.setHtml('<html><body>Partner DUPR Report</body></html>');

    // Verify final state
    const state = useGameStore.getState();
    expect(state.format).toBe(GameType.PARTNER_DUPR);
    expect(state.teams).toHaveLength(2);
    expect(state.results?.teams).toHaveLength(2);
    expect(state.html).toBeTruthy();
  });

  it('should handle error states correctly', () => {
    const store = useGameStore.getState();

    // Start a game flow
    store.setFormat(GameType.DUPR_LADDER);
    store.setInputText('Invalid Player');
    store.setProcessing(true);

    // Simulate error during processing
    store.setProcessing(false);
    store.setError('Failed to fetch player ratings: Network error');

    // Verify error state
    const state = useGameStore.getState();
    expect(state.error).toBe('Failed to fetch player ratings: Network error');
    expect(state.isProcessing).toBe(false);
    expect(state.results).toBeNull();

    // Clear error and retry
    store.setError(null);
    expect(useGameStore.getState().error).toBeNull();
  });

  it('should reset and start new game', () => {
    const store = useGameStore.getState();

    // Complete a game
    store.setFormat(GameType.DUPR_LADDER);
    store.setInputText('Test Input');
    store.setResults({
      players: [
        {
          name: 'Test',
          rating: 3.0,
          found: true,
          profileUrl: null,
          searchMethod: 'exact',
        },
      ],
    });
    store.setHtml('<html>Test</html>');

    // Reset for new game
    store.reset();

    // Verify clean slate
    const state = useGameStore.getState();
    expect(state.format).toBeNull();
    expect(state.inputText).toBe('');
    expect(state.players).toEqual([]);
    expect(state.teams).toEqual([]);
    expect(state.results).toBeNull();
    expect(state.html).toBeNull();
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBeNull();

    // Start new game
    store.setFormat(GameType.PARTNER_DUPR);
    expect(useGameStore.getState().format).toBe(GameType.PARTNER_DUPR);
  });
});
