/**
 * Nickname Resolver Module
 * Handles bidirectional nickname-to-formal name lookups and fuzzy name matching
 *
 * This module provides:
 * - Bidirectional lookup: nickname -> formal names and formal name -> nicknames
 * - Transitive equivalence: "Nick" -> "Nicholas" -> "Nico" means Nick ≡ Nico
 * - Jaro-Winkler fuzzy matching for handling typos and variations
 */

import nicknames from './data/nicknames.json';

// Default fuzzy match threshold (0.85 = 85% similarity required)
export const DEFAULT_FUZZY_THRESHOLD = 0.85;

/**
 * NicknameResolver provides bidirectional nickname-to-formal name lookups
 * and fuzzy name matching using Jaro-Winkler similarity.
 *
 * The nickname data structure in nicknames.json maps nicknames to formal names:
 * { "nick": ["nicholas", "nicolas", "nico"], ... }
 *
 * This resolver builds bidirectional mappings for efficient lookup in both directions.
 */
export class NicknameResolver {
  private nicknameToFormal: Map<string, Set<string>>;
  private formalToNickname: Map<string, Set<string>>;
  private allNames: Set<string>;

  constructor() {
    this.nicknameToFormal = new Map();
    this.formalToNickname = new Map();
    this.allNames = new Set();
    this.loadNicknames();
  }

  /**
   * Load nicknames from the JSON data and build bidirectional mappings
   */
  private loadNicknames(): void {
    // nicknames.json format: { "nickname": ["formal1", "formal2", ...] }
    for (const [nickname, formals] of Object.entries(nicknames)) {
      const nicknameLower = nickname.toLowerCase();
      this.allNames.add(nicknameLower);

      // Initialize nickname -> formal mapping if not exists
      if (!this.nicknameToFormal.has(nicknameLower)) {
        this.nicknameToFormal.set(nicknameLower, new Set());
      }

      for (const formal of formals as string[]) {
        const formalLower = formal.toLowerCase();
        this.allNames.add(formalLower);

        // Add nickname -> formal mapping
        this.nicknameToFormal.get(nicknameLower)!.add(formalLower);

        // Add formal -> nickname mapping
        if (!this.formalToNickname.has(formalLower)) {
          this.formalToNickname.set(formalLower, new Set());
        }
        this.formalToNickname.get(formalLower)!.add(nicknameLower);
      }
    }
  }

  /**
   * Get formal names for a nickname
   * @param nickname The nickname to look up (e.g., "Nick")
   * @returns Set of formal names (e.g., {"nicholas", "nicolas", "nico"})
   */
  getFormalNames(nickname: string): Set<string> {
    return this.nicknameToFormal.get(nickname.toLowerCase()) ?? new Set();
  }

  /**
   * Get nicknames for a formal name
   * @param formalName The formal name to look up (e.g., "Michael")
   * @returns Set of nicknames (e.g., {"mike"})
   */
  getNicknames(formalName: string): Set<string> {
    return this.formalToNickname.get(formalName.toLowerCase()) ?? new Set();
  }

  /**
   * Get all equivalent names (formal + nicknames + name itself)
   * This provides transitive closure - if Nick -> Nicholas and Nicholas -> Nico,
   * then Nick, Nicholas, and Nico are all equivalents of each other.
   *
   * @param name Any name (nickname or formal)
   * @returns Set of all equivalent names
   */
  getAllEquivalents(name: string): Set<string> {
    const nameLower = name.toLowerCase();
    const equivalents = new Set<string>([nameLower]);

    // Add formal names if this is a nickname
    const formals = this.getFormalNames(nameLower);
    formals.forEach((f) => equivalents.add(f));

    // Add nicknames if this is a formal name
    const nicks = this.getNicknames(nameLower);
    nicks.forEach((n) => equivalents.add(n));

    // For each formal name found, also add its other nicknames (transitive closure)
    formals.forEach((formal) => {
      const otherNicks = this.getNicknames(formal);
      otherNicks.forEach((n) => equivalents.add(n));
    });

    // For each nickname found, also add other formal names (transitive closure)
    nicks.forEach((nick) => {
      const otherFormals = this.getFormalNames(nick);
      otherFormals.forEach((f) => equivalents.add(f));
    });

    return equivalents;
  }

  /**
   * Check if two names are equivalent (same person)
   * @param name1 First name
   * @param name2 Second name
   * @returns true if names are equivalent
   */
  areNamesEquivalent(name1: string, name2: string): boolean {
    const name1Lower = name1.toLowerCase();
    const name2Lower = name2.toLowerCase();

    if (name1Lower === name2Lower) return true;

    const equivalents = this.getAllEquivalents(name1);
    return equivalents.has(name2Lower);
  }

  /**
   * Calculate Jaro similarity score between two strings
   * @param s1 First string
   * @param s2 Second string
   * @returns Jaro similarity score between 0 and 1
   */
  private jaroSimilarity(s1: string, s2: string): number {
    const str1 = s1.toLowerCase();
    const str2 = s2.toLowerCase();

    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Calculate match window
    const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const s1Matches = new Array(str1.length).fill(false);
    const s2Matches = new Array(str2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matching characters
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, str2.length);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || str1[i] !== str2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    // Calculate Jaro similarity
    const jaro =
      (matches / str1.length + matches / str2.length + (matches - transpositions / 2) / matches) /
      3;

    return jaro;
  }

  /**
   * Calculate Jaro-Winkler similarity score between two strings
   * This algorithm is specifically chosen for name matching because:
   * - It gives higher scores to strings that match from the beginning
   * - It handles common typos and character transpositions well
   * - It is effective for both short names and longer full names
   *
   * @param s1 First string
   * @param s2 Second string
   * @returns Similarity score between 0 and 1
   */
  getFuzzyScore(s1: string, s2: string): number {
    const str1 = s1.toLowerCase();
    const str2 = s2.toLowerCase();

    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Get Jaro similarity
    const jaro = this.jaroSimilarity(str1, str2);

    // Winkler modification - boost for common prefix (up to 4 characters)
    let prefix = 0;
    const maxPrefix = Math.min(4, str1.length, str2.length);
    for (let i = 0; i < maxPrefix; i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    // Standard Winkler scaling factor is 0.1
    const scalingFactor = 0.1;
    return jaro + prefix * scalingFactor * (1 - jaro);
  }

  /**
   * Check if two names match using fuzzy matching
   * @param name1 First name
   * @param name2 Second name
   * @param threshold Minimum similarity score (default 0.85)
   * @returns true if names are similar enough
   */
  fuzzyMatch(name1: string, name2: string, threshold = DEFAULT_FUZZY_THRESHOLD): boolean {
    return this.getFuzzyScore(name1, name2) >= threshold;
  }

  /**
   * Check if a name is known (either as a nickname or formal name)
   * @param name The name to check
   * @returns true if the name exists in the nickname database
   */
  isKnownName(name: string): boolean {
    return this.allNames.has(name.toLowerCase());
  }

  /**
   * Get all known names in the database
   * @returns Set of all names (both nicknames and formal names)
   */
  getAllKnownNames(): Set<string> {
    return new Set(this.allNames);
  }
}

// Export a default instance for convenience
export const nicknameResolver = new NicknameResolver();

// Export convenience functions that use the default resolver instance
export function getFormalNames(nickname: string): Set<string> {
  return nicknameResolver.getFormalNames(nickname);
}

export function getNicknames(formalName: string): Set<string> {
  return nicknameResolver.getNicknames(formalName);
}

export function getAllEquivalents(name: string): Set<string> {
  return nicknameResolver.getAllEquivalents(name);
}

export function areNamesEquivalent(name1: string, name2: string): boolean {
  return nicknameResolver.areNamesEquivalent(name1, name2);
}

export function getFuzzyScore(name1: string, name2: string): number {
  return nicknameResolver.getFuzzyScore(name1, name2);
}

export function fuzzyMatch(
  name1: string,
  name2: string,
  threshold = DEFAULT_FUZZY_THRESHOLD
): boolean {
  return nicknameResolver.fuzzyMatch(name1, name2, threshold);
}
