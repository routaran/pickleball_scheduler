import {
  NicknameResolver,
  nicknameResolver,
  DEFAULT_FUZZY_THRESHOLD,
  getFormalNames,
  getNicknames,
  getAllEquivalents,
  areNamesEquivalent,
  getFuzzyScore,
  fuzzyMatch,
} from '../nickname-resolver';

describe('NicknameResolver', () => {
  let resolver: NicknameResolver;

  beforeEach(() => {
    resolver = new NicknameResolver();
  });

  describe('getFormalNames', () => {
    it('should return formal names for "Nick"', () => {
      const formals = resolver.getFormalNames('Nick');
      expect(formals.has('nicholas')).toBe(true);
      expect(formals.has('nicolas')).toBe(true);
      expect(formals.has('nico')).toBe(true);
    });

    it('should return formal names for "Bob"', () => {
      const formals = resolver.getFormalNames('Bob');
      expect(formals.has('robert')).toBe(true);
      expect(formals.has('roberto')).toBe(true);
      expect(formals.has('rob')).toBe(true);
    });

    it('should return empty set for unknown nickname', () => {
      const formals = resolver.getFormalNames('Unknown');
      expect(formals.size).toBe(0);
    });

    it('should return empty set for completely unknown name', () => {
      const formals = resolver.getFormalNames('xyz123');
      expect(formals.size).toBe(0);
    });

    it('should be case-insensitive (lowercase)', () => {
      const lower = resolver.getFormalNames('nick');
      expect(lower.has('nicholas')).toBe(true);
    });

    it('should be case-insensitive (uppercase)', () => {
      const upper = resolver.getFormalNames('NICK');
      expect(upper.has('nicholas')).toBe(true);
    });

    it('should be case-insensitive (mixed case)', () => {
      const mixed = resolver.getFormalNames('NiCk');
      expect(mixed.has('nicholas')).toBe(true);
    });

    it('should return same results regardless of case', () => {
      const lower = resolver.getFormalNames('nick');
      const upper = resolver.getFormalNames('NICK');
      const mixed = resolver.getFormalNames('NiCk');
      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });
  });

  describe('getNicknames', () => {
    it('should return nicknames for "Nicholas"', () => {
      const nicks = resolver.getNicknames('Nicholas');
      expect(nicks.has('nick')).toBe(true);
    });

    it('should return nicknames for "Robert"', () => {
      const nicks = resolver.getNicknames('Robert');
      expect(nicks.has('bob')).toBe(true);
      expect(nicks.has('rob')).toBe(true);
    });

    it('should return empty set for unknown formal name', () => {
      const nicks = resolver.getNicknames('Unknown');
      expect(nicks.size).toBe(0);
    });

    it('should return empty set for non-existent name', () => {
      const nicks = resolver.getNicknames('Zyzzyva');
      expect(nicks.size).toBe(0);
    });

    it('should be case-insensitive', () => {
      const lower = resolver.getNicknames('nicholas');
      const upper = resolver.getNicknames('NICHOLAS');
      const mixed = resolver.getNicknames('NiChOlAs');
      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });

    it('should return multiple nicknames for names with many variants', () => {
      const nicks = resolver.getNicknames('William');
      expect(nicks.has('bill')).toBe(true);
      expect(nicks.has('will')).toBe(true);
    });
  });

  describe('getAllEquivalents', () => {
    it('should return all equivalents for "Nick"', () => {
      const equivalents = resolver.getAllEquivalents('Nick');
      expect(equivalents.has('nick')).toBe(true);
      expect(equivalents.has('nicholas')).toBe(true);
      expect(equivalents.has('nicolas')).toBe(true);
      expect(equivalents.has('nico')).toBe(true);
    });

    it('should return all equivalents for "Robert"', () => {
      const equivalents = resolver.getAllEquivalents('Robert');
      expect(equivalents.has('robert')).toBe(true);
      expect(equivalents.has('bob')).toBe(true);
      expect(equivalents.has('rob')).toBe(true);
    });

    it('should be case-insensitive', () => {
      const lower = resolver.getAllEquivalents('nick');
      const upper = resolver.getAllEquivalents('NICK');
      const mixed = resolver.getAllEquivalents('NiCk');
      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });

    it('should include the original name itself', () => {
      const equivalents = resolver.getAllEquivalents('Nick');
      expect(equivalents.has('nick')).toBe(true);
    });

    it('should return transitive equivalents', () => {
      // Nick -> Nicholas and Nicholas -> Nick, so both should be in equivalents
      const nickEquivalents = resolver.getAllEquivalents('Nick');
      const nicholasEquivalents = resolver.getAllEquivalents('Nicholas');

      // Both should contain each other's name
      expect(nickEquivalents.has('nicholas')).toBe(true);
      expect(nicholasEquivalents.has('nick')).toBe(true);
    });

    it('should return only the name itself for unknown names', () => {
      const equivalents = resolver.getAllEquivalents('Xyzzy');
      expect(equivalents.size).toBe(1);
      expect(equivalents.has('xyzzy')).toBe(true);
    });
  });

  describe('areNamesEquivalent', () => {
    it('should return true for nickname and formal name ("Nick", "Nicholas")', () => {
      expect(resolver.areNamesEquivalent('Nick', 'Nicholas')).toBe(true);
    });

    it('should return true for ("Bob", "Robert")', () => {
      expect(resolver.areNamesEquivalent('Bob', 'Robert')).toBe(true);
    });

    it('should return true for same name with different case ("Nick", "nick")', () => {
      expect(resolver.areNamesEquivalent('Nick', 'nick')).toBe(true);
    });

    it('should return true for identical names ("Same", "Same")', () => {
      expect(resolver.areNamesEquivalent('Same', 'Same')).toBe(true);
    });

    it('should return false for unrelated names ("John", "Bob")', () => {
      expect(resolver.areNamesEquivalent('John', 'Bob')).toBe(false);
    });

    it('should return false for completely different names', () => {
      expect(resolver.areNamesEquivalent('Alice', 'Bob')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(resolver.areNamesEquivalent('NICK', 'nicholas')).toBe(true);
      expect(resolver.areNamesEquivalent('nick', 'NICHOLAS')).toBe(true);
      expect(resolver.areNamesEquivalent('NiCk', 'NiChOlAs')).toBe(true);
    });

    it('should return true for variants of the same name', () => {
      // Bill and Will are both nicknames for William
      expect(resolver.areNamesEquivalent('Bill', 'William')).toBe(true);
      expect(resolver.areNamesEquivalent('Will', 'William')).toBe(true);
    });

    it('should return true for symmetric relations', () => {
      expect(resolver.areNamesEquivalent('Nick', 'Nicholas')).toBe(true);
      expect(resolver.areNamesEquivalent('Nicholas', 'Nick')).toBe(true);
    });
  });

  describe('getFuzzyScore', () => {
    it('should return 1.0 for exact match', () => {
      expect(resolver.getFuzzyScore('john', 'john')).toBe(1.0);
    });

    it('should return 1.0 for exact match with different case', () => {
      expect(resolver.getFuzzyScore('John', 'john')).toBe(1.0);
      expect(resolver.getFuzzyScore('JOHN', 'john')).toBe(1.0);
    });

    it('should return high score (> 0.9) for very similar names ("john", "jon")', () => {
      const score = resolver.getFuzzyScore('john', 'jon');
      expect(score).toBeGreaterThan(0.9);
    });

    it('should return lower score (< 0.8) for different names ("john", "jane")', () => {
      const score = resolver.getFuzzyScore('john', 'jane');
      expect(score).toBeLessThan(0.8);
    });

    it('should be case-insensitive', () => {
      const score1 = resolver.getFuzzyScore('John', 'john');
      const score2 = resolver.getFuzzyScore('JOHN', 'JOHN');
      expect(score1).toBe(1.0);
      expect(score2).toBe(1.0);
    });

    it('should return 0.0 when one string is empty', () => {
      expect(resolver.getFuzzyScore('', 'john')).toBe(0.0);
      expect(resolver.getFuzzyScore('john', '')).toBe(0.0);
    });

    it('should return 1.0 when both strings are empty (identical)', () => {
      // Two empty strings are considered identical (exact match)
      expect(resolver.getFuzzyScore('', '')).toBe(1.0);
    });

    it('should return high score for minor typos', () => {
      const score = resolver.getFuzzyScore('michael', 'micheal');
      expect(score).toBeGreaterThan(0.9);
    });

    it('should give higher scores to strings with common prefixes', () => {
      // Jaro-Winkler boosts scores for common prefixes
      const scoreCommonPrefix = resolver.getFuzzyScore('johnson', 'johnsen');
      const scoreDifferentPrefix = resolver.getFuzzyScore('johnson', 'nohnsoj');
      expect(scoreCommonPrefix).toBeGreaterThan(scoreDifferentPrefix);
    });
  });

  describe('fuzzyMatch', () => {
    it('should match similar spellings ("Nicholas", "Nikolas")', () => {
      expect(resolver.fuzzyMatch('Nicholas', 'Nikolas')).toBe(true);
    });

    it('should match variant spellings ("Smith", "Smyth")', () => {
      expect(resolver.fuzzyMatch('Smith', 'Smyth')).toBe(true);
    });

    it('should not match very different names ("John", "Jane")', () => {
      expect(resolver.fuzzyMatch('John', 'Jane')).toBe(false);
    });

    it('should not match completely unrelated names ("John", "Mary")', () => {
      expect(resolver.fuzzyMatch('John', 'Mary')).toBe(false);
    });

    it('should match exact same names', () => {
      expect(resolver.fuzzyMatch('John', 'John')).toBe(true);
    });

    it('should match with custom threshold (lower)', () => {
      // With a lower threshold, more names should match
      expect(resolver.fuzzyMatch('John', 'Joan', 0.7)).toBe(true);
    });

    it('should not match with custom threshold (higher)', () => {
      // With a higher threshold, fewer names should match
      expect(resolver.fuzzyMatch('John', 'Jon', 0.99)).toBe(false);
    });

    it('should use DEFAULT_FUZZY_THRESHOLD by default', () => {
      // Test that the default threshold is being used
      const score = resolver.getFuzzyScore('Nicholas', 'Nikolas');
      const shouldMatch = score >= DEFAULT_FUZZY_THRESHOLD;
      expect(resolver.fuzzyMatch('Nicholas', 'Nikolas')).toBe(shouldMatch);
    });

    it('should be case-insensitive', () => {
      expect(resolver.fuzzyMatch('NICHOLAS', 'nikolas')).toBe(true);
      expect(resolver.fuzzyMatch('nicholas', 'NIKOLAS')).toBe(true);
    });

    it('should match common typos', () => {
      expect(resolver.fuzzyMatch('Michael', 'Micheal')).toBe(true);
      expect(resolver.fuzzyMatch('Matthew', 'Mathew')).toBe(true);
    });
  });

  describe('isKnownName', () => {
    it('should return true for known nicknames', () => {
      expect(resolver.isKnownName('Nick')).toBe(true);
      expect(resolver.isKnownName('Bob')).toBe(true);
    });

    it('should return true for known formal names', () => {
      expect(resolver.isKnownName('Nicholas')).toBe(true);
      expect(resolver.isKnownName('Robert')).toBe(true);
    });

    it('should return false for unknown names', () => {
      expect(resolver.isKnownName('Xyzzy')).toBe(false);
      expect(resolver.isKnownName('Unknown123')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(resolver.isKnownName('nick')).toBe(true);
      expect(resolver.isKnownName('NICK')).toBe(true);
      expect(resolver.isKnownName('NiCk')).toBe(true);
    });
  });

  describe('getAllKnownNames', () => {
    it('should return a set of all known names', () => {
      const names = resolver.getAllKnownNames();
      expect(names.size).toBeGreaterThan(0);
    });

    it('should include both nicknames and formal names', () => {
      const names = resolver.getAllKnownNames();
      expect(names.has('nick')).toBe(true);
      expect(names.has('nicholas')).toBe(true);
    });

    it('should return a new set instance', () => {
      const names1 = resolver.getAllKnownNames();
      const names2 = resolver.getAllKnownNames();
      expect(names1).not.toBe(names2);
    });
  });
});

describe('Default nicknameResolver instance', () => {
  it('should be exported and be an instance of NicknameResolver', () => {
    expect(nicknameResolver).toBeInstanceOf(NicknameResolver);
  });

  it('should be functional with areNamesEquivalent', () => {
    expect(nicknameResolver.areNamesEquivalent('Bob', 'Robert')).toBe(true);
  });

  it('should be functional with getFormalNames', () => {
    const formals = nicknameResolver.getFormalNames('Nick');
    expect(formals.has('nicholas')).toBe(true);
  });

  it('should be functional with getNicknames', () => {
    const nicks = nicknameResolver.getNicknames('Robert');
    expect(nicks.has('bob')).toBe(true);
  });

  it('should be functional with fuzzyMatch', () => {
    expect(nicknameResolver.fuzzyMatch('Nicholas', 'Nikolas')).toBe(true);
  });
});

describe('Exported convenience functions', () => {
  describe('getFormalNames function', () => {
    it('should return formal names for a nickname', () => {
      const formals = getFormalNames('Nick');
      expect(formals.has('nicholas')).toBe(true);
    });
  });

  describe('getNicknames function', () => {
    it('should return nicknames for a formal name', () => {
      const nicks = getNicknames('Robert');
      expect(nicks.has('bob')).toBe(true);
    });
  });

  describe('getAllEquivalents function', () => {
    it('should return all equivalent names', () => {
      const equivalents = getAllEquivalents('Nick');
      expect(equivalents.has('nick')).toBe(true);
      expect(equivalents.has('nicholas')).toBe(true);
    });
  });

  describe('areNamesEquivalent function', () => {
    it('should check if names are equivalent', () => {
      expect(areNamesEquivalent('Nick', 'Nicholas')).toBe(true);
      expect(areNamesEquivalent('John', 'Bob')).toBe(false);
    });
  });

  describe('getFuzzyScore function', () => {
    it('should return fuzzy similarity score', () => {
      expect(getFuzzyScore('john', 'john')).toBe(1.0);
      expect(getFuzzyScore('john', 'jon')).toBeGreaterThan(0.9);
    });
  });

  describe('fuzzyMatch function', () => {
    it('should check if names fuzzy match', () => {
      expect(fuzzyMatch('Nicholas', 'Nikolas')).toBe(true);
      expect(fuzzyMatch('John', 'Mary')).toBe(false);
    });

    it('should accept custom threshold', () => {
      expect(fuzzyMatch('John', 'Joan', 0.7)).toBe(true);
    });
  });
});

describe('DEFAULT_FUZZY_THRESHOLD constant', () => {
  it('should be exported and equal to 0.85', () => {
    expect(DEFAULT_FUZZY_THRESHOLD).toBe(0.85);
  });
});
