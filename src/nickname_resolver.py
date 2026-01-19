"""Nickname resolution for matching informal names to formal names."""

import json
import os
from pathlib import Path
from typing import Dict, Set, Optional

from rapidfuzz.distance import JaroWinkler


class NicknameResolver:
    """Resolves nicknames to formal names and vice versa."""
    
    # Default threshold for fuzzy matching (0.85 = 85% similarity)
    DEFAULT_FUZZY_THRESHOLD = 0.85
    
    def __init__(self, nicknames_file: Optional[str] = None):
        """Initialize the resolver with nickname mappings.
        
        Args:
            nicknames_file: Path to the nicknames JSON file. If None, uses default location.
        """
        if nicknames_file is None:
            # Default location: config/nicknames.json relative to project root
            project_root = Path(__file__).parent.parent
            nicknames_file = project_root / "config" / "nicknames.json"
        
        self._nickname_to_formal: Dict[str, Set[str]] = {}
        self._formal_to_nicknames: Dict[str, Set[str]] = {}
        self._all_names: Set[str] = set()
        
        self._load_nicknames(nicknames_file)
    
    def _load_nicknames(self, filepath: str | Path) -> None:
        """Load nickname mappings from JSON file."""
        filepath = Path(filepath)
        
        if not filepath.exists():
            # No nicknames file - resolver will still work with fuzzy matching
            return
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (json.JSONDecodeError, IOError):
            # Invalid file - continue without nicknames
            return
        
        # Build bidirectional lookup
        for nickname, formal_names in data.items():
            nickname_lower = nickname.lower()
            self._all_names.add(nickname_lower)
            
            if nickname_lower not in self._nickname_to_formal:
                self._nickname_to_formal[nickname_lower] = set()
            
            for formal in formal_names:
                formal_lower = formal.lower()
                self._all_names.add(formal_lower)
                
                # nickname -> formal mapping
                self._nickname_to_formal[nickname_lower].add(formal_lower)
                
                # formal -> nickname mapping
                if formal_lower not in self._formal_to_nicknames:
                    self._formal_to_nicknames[formal_lower] = set()
                self._formal_to_nicknames[formal_lower].add(nickname_lower)
                
                # Also treat formal names as potentially mapping to each other
                # e.g., "nicholas" maps to "nick" and "nico", so "nicholas" group includes those
    
    def get_formal_names(self, nickname: str) -> Set[str]:
        """Get all formal names that could match a nickname.
        
        Args:
            nickname: The nickname to look up.
            
        Returns:
            Set of formal names that this nickname maps to.
        """
        return self._nickname_to_formal.get(nickname.lower(), set())
    
    def get_nicknames(self, formal_name: str) -> Set[str]:
        """Get all nicknames for a formal name.
        
        Args:
            formal_name: The formal name to look up.
            
        Returns:
            Set of nicknames for this formal name.
        """
        return self._formal_to_nicknames.get(formal_name.lower(), set())
    
    def get_all_equivalents(self, name: str) -> Set[str]:
        """Get all equivalent names (both directions).
        
        Args:
            name: The name to find equivalents for.
            
        Returns:
            Set of all names that could be equivalent to this one.
        """
        name_lower = name.lower()
        equivalents = {name_lower}
        
        # Add formal names if this is a nickname
        formal_names = self.get_formal_names(name_lower)
        equivalents.update(formal_names)
        
        # Add nicknames if this is a formal name
        nicknames = self.get_nicknames(name_lower)
        equivalents.update(nicknames)
        
        # For each formal name, also add other nicknames
        for formal in formal_names:
            equivalents.update(self.get_nicknames(formal))
        
        # For each nickname, also add other formal names
        for nick in nicknames:
            equivalents.update(self.get_formal_names(nick))
        
        return equivalents
    
    def are_names_equivalent(self, name1: str, name2: str) -> bool:
        """Check if two names are equivalent via nickname mapping.
        
        Args:
            name1: First name to compare.
            name2: Second name to compare.
            
        Returns:
            True if the names are equivalent.
        """
        name1_lower = name1.lower()
        name2_lower = name2.lower()
        
        # Exact match
        if name1_lower == name2_lower:
            return True
        
        # Check if name2 is in name1's equivalents
        return name2_lower in self.get_all_equivalents(name1_lower)
    
    def fuzzy_match(self, name1: str, name2: str, threshold: float = None) -> bool:
        """Check if two names are similar using fuzzy matching.
        
        Uses Jaro-Winkler similarity which is good for names.
        
        Args:
            name1: First name to compare.
            name2: Second name to compare.
            threshold: Minimum similarity score (0-1). Defaults to DEFAULT_FUZZY_THRESHOLD.
            
        Returns:
            True if the names are similar enough.
        """
        if threshold is None:
            threshold = self.DEFAULT_FUZZY_THRESHOLD
        
        # Jaro-Winkler is good for names - gives higher scores to strings
        # that match from the beginning
        similarity = JaroWinkler.normalized_similarity(name1.lower(), name2.lower())
        return similarity >= threshold
    
    def get_fuzzy_score(self, name1: str, name2: str) -> float:
        """Get the fuzzy similarity score between two names.
        
        Args:
            name1: First name to compare.
            name2: Second name to compare.
            
        Returns:
            Similarity score between 0 and 1.
        """
        return JaroWinkler.normalized_similarity(name1.lower(), name2.lower())


# Global instance for convenience
_resolver: Optional[NicknameResolver] = None


def get_resolver() -> NicknameResolver:
    """Get the global NicknameResolver instance."""
    global _resolver
    if _resolver is None:
        _resolver = NicknameResolver()
    return _resolver


def are_names_equivalent(name1: str, name2: str) -> bool:
    """Check if two names are equivalent using nickname mappings.
    
    Convenience function using the global resolver.
    """
    return get_resolver().are_names_equivalent(name1, name2)


def fuzzy_match(name1: str, name2: str, threshold: float = None) -> bool:
    """Check if two names are similar using fuzzy matching.
    
    Convenience function using the global resolver.
    """
    return get_resolver().fuzzy_match(name1, name2, threshold)


def get_fuzzy_score(name1: str, name2: str) -> float:
    """Get the fuzzy similarity score between two names.
    
    Convenience function using the global resolver.
    """
    return get_resolver().get_fuzzy_score(name1, name2)
