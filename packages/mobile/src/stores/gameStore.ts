import { create } from 'zustand';
import {
  GameType,
  Team,
  PlayerWithRating,
  TeamWithRatings,
  PlayerPool,
  TeamPool,
  distributePlayersToPool,
  distributePlayersToPickleBrosPools,
  distributeTeamsToPool,
  calculateTeamRating,
  generateDuprLadderHtml,
  generatePartnerDuprHtml,
  generatePickleBrosMondayHtml,
  DEFAULT_RATING,
} from '@dupr/core';

interface PlayerReference {
  name: string;
  // Additional fields may be added later
}

interface ParsedGame {
  players: PlayerWithRating[];
  teams?: TeamWithRatings[];
  pools?: PlayerPool[];
  teamPools?: TeamPool[];
}

/** Status of an individual player search */
export type SearchStatus = 'found' | 'default' | 'error';

/** Progress entry for a single player search */
export interface SearchProgressEntry {
  name: string;
  status: SearchStatus;
  duprName?: string;
  rating?: number;
}

/** Overall search progress state */
export interface SearchProgress {
  total: number;
  current: number;
  currentName: string;
  completed: SearchProgressEntry[];
}

interface GameState {
  format: GameType | null;
  inputText: string;
  players: PlayerReference[];
  teams: Team[];
  results: ParsedGame | null;
  html: string | null;
  isProcessing: boolean;
  error: string | null;
  searchProgress: SearchProgress | null;
  courtCount: number | null;  // Number of courts available for DUPR Ladder/Partner DUPR

  // Rating override state
  ratingOverrides: Record<string, number>;  // playerName -> customRating
  editingPlayer: PlayerWithRating | null;   // player being edited

  setFormat(format: GameType | null): void;
  setInputText(text: string): void;
  setPlayers(players: PlayerReference[]): void;
  setTeams(teams: Team[]): void;
  setResults(results: ParsedGame | null): void;
  setHtml(html: string | null): void;
  setProcessing(isProcessing: boolean): void;
  setError(error: string | null): void;
  setSearchProgress(progress: SearchProgress | null): void;
  addSearchResult(entry: SearchProgressEntry): void;
  updateSearchCurrent(current: number, currentName: string): void;
  setCourtCount(count: number | null): void;
  reset(): void;

  // Rating override actions
  setEditingPlayer(player: PlayerWithRating | null): void;
  updatePlayerRating(playerName: string, newRating: number): void;
  resetPlayerRating(playerName: string): void;
}

export const useGameStore = create<GameState>((set, get) => ({
  format: null,
  inputText: '',
  players: [],
  teams: [],
  results: null,
  html: null,
  isProcessing: false,
  error: null,
  searchProgress: null,
  courtCount: null,
  ratingOverrides: {},
  editingPlayer: null,

  setFormat: (format) => set({ format }),
  setInputText: (inputText) => set({ inputText }),
  setPlayers: (players) => set({ players }),
  setTeams: (teams) => set({ teams }),
  setResults: (results) => set({ results }),
  setHtml: (html) => set({ html }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setError: (error) => set({ error }),
  setSearchProgress: (searchProgress) => set({ searchProgress }),
  addSearchResult: (entry) => set((state) => {
    if (!state.searchProgress) return state;
    return {
      searchProgress: {
        ...state.searchProgress,
        completed: [...state.searchProgress.completed, entry],
      },
    };
  }),
  updateSearchCurrent: (current: number, currentName: string) => set((state) => {
    if (!state.searchProgress) return state;
    return {
      searchProgress: {
        ...state.searchProgress,
        current,
        currentName,
      },
    };
  }),
  setCourtCount: (courtCount) => set({ courtCount }),
  reset: () => set({
    format: null,
    inputText: '',
    players: [],
    teams: [],
    results: null,
    html: null,
    isProcessing: false,
    error: null,
    searchProgress: null,
    courtCount: null,
    ratingOverrides: {},
    editingPlayer: null,
  }),

  // Rating override actions
  setEditingPlayer: (player) => set({ editingPlayer: player }),

  updatePlayerRating: (playerName: string, newRating: number) => {
    const state = get();
    if (!state.results) return;

    // Store the override
    const newOverrides = {
      ...state.ratingOverrides,
      [playerName]: newRating,
    };

    // Update player rating in results.players
    const updatedPlayers = state.results.players.map((p) =>
      p.name === playerName ? { ...p, rating: newRating } : p
    );

    // Recalculate pools/teams based on format
    let updatedPools: PlayerPool[] | undefined;
    let updatedTeams: TeamWithRatings[] | undefined;
    let updatedTeamPools: TeamPool[] | undefined;
    let updatedHtml: string | null = state.html;

    if (state.format === GameType.DUPR_LADDER) {
      updatedPools = distributePlayersToPool(updatedPlayers);
      updatedHtml = generateDuprLadderHtml(updatedPlayers);
    } else if (state.format === GameType.PICKLEBROS_MONDAY) {
      updatedPools = distributePlayersToPickleBrosPools(updatedPlayers);
      updatedHtml = generatePickleBrosMondayHtml(updatedPlayers);
    } else if (state.format === GameType.PARTNER_DUPR && state.results.teams) {
      // For Partner DUPR, update team ratings as well
      updatedTeams = state.results.teams.map((team) => {
        const p1 = team.player1.name === playerName
          ? { ...team.player1, rating: newRating }
          : team.player1;
        const p2 = team.player2.name === playerName
          ? { ...team.player2, rating: newRating }
          : team.player2;
        return {
          player1: p1,
          player2: p2,
          teamRating: calculateTeamRating(p1.rating, p2.rating),
        };
      });
      // Recalculate team pools based on updated team ratings
      updatedTeamPools = distributeTeamsToPool(updatedTeams);
      updatedHtml = generatePartnerDuprHtml(updatedTeams);
    }

    set({
      ratingOverrides: newOverrides,
      editingPlayer: null,
      results: {
        ...state.results,
        players: updatedPlayers,
        pools: updatedPools,
        teams: updatedTeams ?? state.results.teams,
        teamPools: updatedTeamPools ?? state.results.teamPools,
      },
      html: updatedHtml,
    });
  },

  resetPlayerRating: (playerName: string) => {
    const state = get();
    if (!state.results) return;

    // Remove the override
    const newOverrides = { ...state.ratingOverrides };
    delete newOverrides[playerName];

    // Reset player rating to DEFAULT_RATING
    const updatedPlayers = state.results.players.map((p) =>
      p.name === playerName ? { ...p, rating: DEFAULT_RATING } : p
    );

    // Recalculate pools/teams based on format
    let updatedPools: PlayerPool[] | undefined;
    let updatedTeams: TeamWithRatings[] | undefined;
    let updatedTeamPools: TeamPool[] | undefined;
    let updatedHtml: string | null = state.html;

    if (state.format === GameType.DUPR_LADDER) {
      updatedPools = distributePlayersToPool(updatedPlayers);
      updatedHtml = generateDuprLadderHtml(updatedPlayers);
    } else if (state.format === GameType.PICKLEBROS_MONDAY) {
      updatedPools = distributePlayersToPickleBrosPools(updatedPlayers);
      updatedHtml = generatePickleBrosMondayHtml(updatedPlayers);
    } else if (state.format === GameType.PARTNER_DUPR && state.results.teams) {
      updatedTeams = state.results.teams.map((team) => {
        const p1 = team.player1.name === playerName
          ? { ...team.player1, rating: DEFAULT_RATING }
          : team.player1;
        const p2 = team.player2.name === playerName
          ? { ...team.player2, rating: DEFAULT_RATING }
          : team.player2;
        return {
          player1: p1,
          player2: p2,
          teamRating: calculateTeamRating(p1.rating, p2.rating),
        };
      });
      // Recalculate team pools based on updated team ratings
      updatedTeamPools = distributeTeamsToPool(updatedTeams);
      updatedHtml = generatePartnerDuprHtml(updatedTeams);
    }

    set({
      ratingOverrides: newOverrides,
      editingPlayer: null,
      results: {
        ...state.results,
        players: updatedPlayers,
        pools: updatedPools,
        teams: updatedTeams ?? state.results.teams,
        teamPools: updatedTeamPools ?? state.results.teamPools,
      },
      html: updatedHtml,
    });
  },
}));
