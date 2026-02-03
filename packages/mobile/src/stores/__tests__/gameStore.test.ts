import { useGameStore } from '../gameStore';
import { GameType } from '@dupr/core';

describe('gameStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.getState().reset();
  });

  it('should have correct initial state', () => {
    const state = useGameStore.getState();

    expect(state.format).toBeNull();
    expect(state.inputText).toBe('');
    expect(state.players).toEqual([]);
    expect(state.teams).toEqual([]);
    expect(state.results).toBeNull();
    expect(state.html).toBeNull();
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set format', () => {
    const { setFormat } = useGameStore.getState();

    setFormat(GameType.DUPR_LADDER);

    expect(useGameStore.getState().format).toBe(GameType.DUPR_LADDER);
  });

  it('should set input text', () => {
    const { setInputText } = useGameStore.getState();
    const testText = 'John Doe\nJane Smith\nBob Johnson';

    setInputText(testText);

    expect(useGameStore.getState().inputText).toBe(testText);
  });

  it('should set players', () => {
    const { setPlayers } = useGameStore.getState();
    const testPlayers = [
      { name: 'John Doe' },
      { name: 'Jane Smith' },
    ];

    setPlayers(testPlayers);

    expect(useGameStore.getState().players).toEqual(testPlayers);
  });

  it('should set teams', () => {
    const { setTeams } = useGameStore.getState();
    const testTeams = [
      { player1: 'John Doe', player2: 'Jane Smith' },
      { player1: 'Bob Johnson', player2: 'Alice Williams' },
    ];

    setTeams(testTeams);

    expect(useGameStore.getState().teams).toEqual(testTeams);
  });

  it('should set results', () => {
    const { setResults } = useGameStore.getState();
    const testResults = {
      players: [
        {
          name: 'John Doe',
          rating: 4.5,
          found: true,
          profileUrl: 'https://example.com/john',
          searchMethod: 'exact',
        },
      ],
    };

    setResults(testResults);

    expect(useGameStore.getState().results).toEqual(testResults);
  });

  it('should set HTML', () => {
    const { setHtml } = useGameStore.getState();
    const testHtml = '<html><body>Test</body></html>';

    setHtml(testHtml);

    expect(useGameStore.getState().html).toBe(testHtml);
  });

  it('should set processing state', () => {
    const { setProcessing } = useGameStore.getState();

    setProcessing(true);
    expect(useGameStore.getState().isProcessing).toBe(true);

    setProcessing(false);
    expect(useGameStore.getState().isProcessing).toBe(false);
  });

  it('should set error', () => {
    const { setError } = useGameStore.getState();
    const testError = 'Something went wrong';

    setError(testError);

    expect(useGameStore.getState().error).toBe(testError);
  });

  it('should reset all state', () => {
    const store = useGameStore.getState();

    // Set some values
    store.setFormat(GameType.PARTNER_DUPR);
    store.setInputText('Test input');
    store.setPlayers([{ name: 'Test Player' }]);
    store.setTeams([{ player1: 'A', player2: 'B' }]);
    store.setResults({
      players: [
        {
          name: 'Test',
          rating: 3.0,
          found: true,
          profileUrl: null,
          searchMethod: 'fuzzy',
        },
      ],
    });
    store.setHtml('<html>Test</html>');
    store.setProcessing(true);
    store.setError('Test error');

    // Reset
    store.reset();

    // Verify all fields are reset
    const state = useGameStore.getState();
    expect(state.format).toBeNull();
    expect(state.inputText).toBe('');
    expect(state.players).toEqual([]);
    expect(state.teams).toEqual([]);
    expect(state.results).toBeNull();
    expect(state.html).toBeNull();
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should manage state across multiple screens', () => {
    const store = useGameStore.getState();

    // Simulate Screen 1: Format selection
    store.setFormat(GameType.DUPR_LADDER);

    // Simulate Screen 2: Input
    store.setInputText('John Doe\nJane Smith');

    // Simulate Screen 3: Processing
    store.setProcessing(true);

    // Verify state is maintained
    expect(useGameStore.getState().format).toBe(GameType.DUPR_LADDER);
    expect(useGameStore.getState().inputText).toBe('John Doe\nJane Smith');
    expect(useGameStore.getState().isProcessing).toBe(true);

    // Simulate Screen 4: Results
    store.setProcessing(false);
    store.setResults({
      players: [
        {
          name: 'John Doe',
          rating: 4.2,
          found: true,
          profileUrl: 'https://example.com/john',
          searchMethod: 'exact',
        },
        {
          name: 'Jane Smith',
          rating: 3.8,
          found: true,
          profileUrl: 'https://example.com/jane',
          searchMethod: 'exact',
        },
      ],
    });
    store.setHtml('<html><body>Results</body></html>');

    // Verify complete state
    const finalState = useGameStore.getState();
    expect(finalState.format).toBe(GameType.DUPR_LADDER);
    expect(finalState.inputText).toBe('John Doe\nJane Smith');
    expect(finalState.isProcessing).toBe(false);
    expect(finalState.results).toBeDefined();
    expect(finalState.results?.players).toHaveLength(2);
    expect(finalState.html).toBe('<html><body>Results</body></html>');
    expect(finalState.error).toBeNull();
  });
});
