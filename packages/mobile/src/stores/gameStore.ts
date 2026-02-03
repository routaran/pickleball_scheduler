import { create } from 'zustand';
import { GameType, Team, PlayerWithRating, TeamWithRatings, PlayerPool } from '@dupr/core';

interface PlayerReference {
  name: string;
  // Additional fields may be added later
}

interface ParsedGame {
  players: PlayerWithRating[];
  teams?: TeamWithRatings[];
  pools?: PlayerPool[];
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
  reset(): void;
}

export const useGameStore = create<GameState>((set) => ({
  format: null,
  inputText: '',
  players: [],
  teams: [],
  results: null,
  html: null,
  isProcessing: false,
  error: null,
  searchProgress: null,

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
  }),
}));
