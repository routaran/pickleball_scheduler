"""Player search algorithm for finding DUPR ratings."""

import re
import sys
from dataclasses import dataclass
from typing import Optional, List, Tuple

from .config import Config, debug_log
from .dupr_client import DUPRClient, DUPRPlayer, DUPRAPIError, TokenExpiredError
from .nickname_resolver import (
    NicknameResolver, get_resolver, are_names_equivalent, 
    fuzzy_match, get_fuzzy_score
)
from .player_registry import PlayerRegistry, get_registry, save_registry, reset_registry
from .interactive_confirm import prompt_player_selection, is_interactive


@dataclass
class SearchResult:
    """Result of a player search."""
    name: str
    rating: float
    player_id: Optional[int]
    profile_url: Optional[str]
    found: bool
    search_method: str  # Describes how the player was found


# Common short last names that need special handling (full name search preferred)
SHORT_COMMON_LASTNAMES = {
    'ng', 'hu', 'wu', 'li', 'le', 'lu', 'ma', 'xu', 'yu', 'ye', 'he', 'ho',
    'wong', 'chen', 'wang', 'zhang', 'liu', 'yang', 'huang', 'zhao', 'zhou', 'sun'
}


class PlayerSearcher:
    """Searches for players using the defined algorithm."""

    # Fuzzy matching threshold for first names
    FUZZY_THRESHOLD = 0.85

    def __init__(self, config: Config, client: DUPRClient, registry: Optional[PlayerRegistry] = None):
        self.config = config
        self.client = client
        self.nickname_resolver = get_resolver()
        # Use provided registry or global instance
        self.player_registry = registry if registry is not None else get_registry()

    def _clean_name(self, name: str) -> str:
        """
        Clean player name by removing guest markers and other annotations.

        Removes:
        - (G) or (g) - guest marker
        - (Guest) - full guest marker
        - Trailing parenthetical annotations
        """
        # Remove common guest markers
        cleaned = re.sub(r'\s*\([Gg](uest)?\)\s*', '', name)
        # Remove any other trailing parenthetical content
        cleaned = re.sub(r'\s*\([^)]*\)\s*$', '', cleaned)
        return cleaned.strip()

    def _normalize_name(self, name: str) -> str:
        """Normalize a name for comparison."""
        return name.lower().strip()

    def _first_name_matches(self, search_first: str, api_first: str) -> bool:
        """Check if the search first name matches the API first name.
        
        Uses a multi-tier matching approach:
        1. Substring matching (original behavior)
        2. Nickname equivalence (e.g., Nick = Nicholas)
        3. Fuzzy matching as fallback (threshold ~0.85)
        """
        search_normalized = self._normalize_name(search_first)
        api_normalized = self._normalize_name(api_first)
        
        # Tier 1: Substring matching (original logic)
        if search_normalized in api_normalized or api_normalized in search_normalized:
            return True
        
        # Tier 2: Nickname equivalence
        if are_names_equivalent(search_normalized, api_normalized):
            debug_log(f"Nickname match: '{search_first}' ~ '{api_first}'")
            return True
        
        # Tier 3: Fuzzy matching (for typos and variations)
        if fuzzy_match(search_normalized, api_normalized, self.FUZZY_THRESHOLD):
            score = get_fuzzy_score(search_normalized, api_normalized)
            debug_log(f"Fuzzy match: '{search_first}' ~ '{api_first}' (score: {score:.2f})")
            return True
        
        return False

    def _find_unique_match(
        self,
        players: List[DUPRPlayer],
        first_name: str,
        full_name: str
    ) -> Optional[DUPRPlayer]:
        """Find a unique match in the player list.

        Matching priority:
        1. If only one result, return it
        2. Look for exact full name match (case-insensitive)
        3. Fall back to first name matching if no exact match
        4. If multiple matches, use interactive selection or best fuzzy score
        """
        if len(players) == 1:
            return players[0]

        # First: Look for exact full name match
        full_name_normalized = self._normalize_name(full_name)
        exact_matches = [
            p for p in players
            if self._normalize_name(p.full_name) == full_name_normalized
        ]

        if len(exact_matches) == 1:
            debug_log(f"Found exact full name match: {exact_matches[0].full_name}")
            return exact_matches[0]

        if len(exact_matches) > 1:
            debug_log(f"Found {len(exact_matches)} exact full name matches for '{full_name}'")
            # Multiple exact matches - prompt for selection or use first
            return self._resolve_ambiguous_matches(exact_matches, full_name)

        # Fallback: First name matching (for cases where full name doesn't exactly match)
        matches = [
            p for p in players
            if self._first_name_matches(first_name, p.first_name)
        ]

        if len(matches) == 1:
            debug_log(f"Found unique first name match: {matches[0].full_name}")
            return matches[0]

        if len(matches) > 1:
            debug_log(f"Found {len(matches)} first name matches for '{first_name}'")
            return self._resolve_ambiguous_matches(matches, full_name)
        
        # No first name matches - try fuzzy matching on full name
        fuzzy_matches = self._get_fuzzy_matches(players, full_name)
        if fuzzy_matches:
            if len(fuzzy_matches) == 1:
                debug_log(f"Found unique fuzzy match: {fuzzy_matches[0].full_name}")
                return fuzzy_matches[0]
            return self._resolve_ambiguous_matches(fuzzy_matches, full_name)

        debug_log(f"No unique match found for '{first_name}'")
        return None
    
    def _get_fuzzy_matches(
        self,
        players: List[DUPRPlayer],
        search_name: str,
        threshold: float = 0.75
    ) -> List[DUPRPlayer]:
        """Get players that fuzzy-match the search name.
        
        Args:
            players: List of players to search.
            search_name: Name to match against.
            threshold: Minimum similarity score.
            
        Returns:
            List of players with fuzzy match score above threshold, sorted by score.
        """
        scored_players = []
        for player in players:
            score = get_fuzzy_score(search_name, player.full_name)
            if score >= threshold:
                scored_players.append((player, score))
        
        # Sort by score descending
        scored_players.sort(key=lambda x: x[1], reverse=True)
        return [p for p, _ in scored_players]
    
    def _resolve_ambiguous_matches(
        self,
        candidates: List[DUPRPlayer],
        search_name: str
    ) -> Optional[DUPRPlayer]:
        """Resolve ambiguous matches using interactive selection or best score.
        
        Args:
            candidates: List of candidate players.
            search_name: The name being searched for.
            
        Returns:
            Selected player or None if cancelled/failed.
        """
        if not candidates:
            return None
        
        # Sort by fuzzy score first
        scored = [(p, get_fuzzy_score(search_name, p.full_name)) for p in candidates]
        scored.sort(key=lambda x: x[1], reverse=True)
        sorted_candidates = [p for p, _ in scored]
        best_score = scored[0][1]
        
        # In interactive mode, prompt for selection
        if is_interactive():
            selected = prompt_player_selection(search_name, sorted_candidates)
            if selected:
                debug_log(f"User selected: {selected.full_name}")
            return selected
        
        # Non-interactive mode: only auto-select if high confidence
        # A score >= 0.95 means very high similarity (e.g., "Nick" vs "Nicholas" with same last name)
        if best_score >= 0.95:
            selected = sorted_candidates[0]
            debug_log(f"Auto-selected high-confidence match ({best_score:.2f}): {selected.full_name}")
            return selected
        
        # Ambiguous matches in non-interactive mode - be conservative and return None
        debug_log(f"Ambiguous matches (best score {best_score:.2f}), no auto-selection in non-interactive mode")
        return None

    def _search_with_filter(
        self,
        query: str,
        first_name: str,
        full_name: str,
        location_text: Optional[str],
        lat: Optional[float],
        lng: Optional[float],
        filter_desc: str
    ) -> Tuple[Optional[DUPRPlayer], str]:
        """Perform a search with the given filter settings."""
        debug_log(f"Searching '{query}' with filter: {filter_desc}")

        try:
            players = self.client.search_players(
                query=query,
                location_text=location_text,
                lat=lat,
                lng=lng
            )
        except DUPRAPIError as e:
            debug_log(f"API error during search: {e}")
            return None, ""

        match = self._find_unique_match(players, first_name, full_name)
        if match:
            return match, f"{filter_desc}"

        return None, ""

    def _is_short_common_lastname(self, name: str) -> bool:
        """Check if a name is a short common last name that needs special handling."""
        return name.lower() in SHORT_COMMON_LASTNAMES

    def search_player(self, full_name: str) -> SearchResult:
        """
        Search for a player using the defined algorithm.

        Search sequence:
        1. Check player registry (cached matches)
        2. Check player_overrides.json (using original and cleaned names)
        3. Full Name + Alberta filter
        4. Last Name + Alberta filter (skip for very common short last names)
        5. Full Name + Canada filter
        6. Last Name + Canada filter
        7. Last Name + No filter
        8. Fallback to default rating
        """
        # Step 1: Check player registry for cached name mappings
        # Registry stores the mapping from informal name -> DUPR name
        # We use this to search with the correct name, then get fresh rating
        registered = self.player_registry.get(full_name)
        if registered:
            debug_log(f"Found in registry: '{full_name}' -> '{registered.dupr_name}'")
            # Search using the known DUPR name to get fresh rating
            try:
                players = self.client.search_players(
                    query=registered.dupr_name,
                    location_text=self.config.ALBERTA_TEXT,
                    lat=self.config.ALBERTA_LAT,
                    lng=self.config.ALBERTA_LNG
                )
                # Find the exact match by DUPR ID or name
                for player in players:
                    if player.dupr_id == registered.dupr_id or \
                       self._normalize_name(player.full_name) == self._normalize_name(registered.dupr_name):
                        debug_log(f"Fetched fresh rating for '{registered.dupr_name}': {player.best_rating}")
                        # Update cached rating for next time
                        self.player_registry.register(
                            search_name=full_name,
                            dupr_id=player.dupr_id,
                            dupr_name=player.full_name,
                            rating=player.best_rating,
                            location=player.short_address
                        )
                        return self._create_result(full_name, player, f"Registry: {registered.dupr_name}")
                # Player not found in search results - registry entry may be stale
                debug_log(f"Registry entry for '{full_name}' not found in API, continuing with normal search")
            except DUPRAPIError as e:
                debug_log(f"API error during registry lookup: {e}, falling back to cached data")
                # Fall back to cached rating if API fails
                rating = registered.rating if registered.rating else self.config.DEFAULT_RATING
                return SearchResult(
                    name=full_name,
                    rating=rating,
                    player_id=None,
                    profile_url=f"https://dashboard.dupr.com/dashboard/player/{registered.dupr_id}" if registered.dupr_id else None,
                    found=True,
                    search_method=f"Registry (cached): {registered.dupr_name}"
                )
        
        # Check override with original name first
        name_key = self._normalize_name(full_name)
        if name_key in self.config.overrides:
            override = self.config.overrides[name_key]
            debug_log(f"Using override for '{full_name}': {override.rating} ({override.reason})")
            return SearchResult(
                name=full_name,
                rating=override.rating,
                player_id=None,
                profile_url=None,
                found=True,
                search_method=f"Override: {override.reason}"
            )

        # Clean the name (remove guest markers, etc.)
        cleaned_name = self._clean_name(full_name)
        if cleaned_name != full_name:
            debug_log(f"Cleaned name: '{full_name}' -> '{cleaned_name}'")

        # Check override with cleaned name if different
        cleaned_key = self._normalize_name(cleaned_name)
        if cleaned_key != name_key and cleaned_key in self.config.overrides:
            override = self.config.overrides[cleaned_key]
            debug_log(f"Using override for cleaned name '{cleaned_name}': {override.rating} ({override.reason})")
            return SearchResult(
                name=full_name,
                rating=override.rating,
                player_id=None,
                profile_url=None,
                found=True,
                search_method=f"Override: {override.reason}"
            )

        # Parse cleaned name
        name_parts = cleaned_name.strip().split()
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[-1] if len(name_parts) > 1 else name_parts[0] if name_parts else ""

        # Determine if this is a short common last name
        is_short_lastname = self._is_short_common_lastname(last_name)
        if is_short_lastname:
            debug_log(f"Short common last name detected: '{last_name}'")

        try:
            # Step 2: Full Name + Alberta filter (primary search)
            match, method = self._search_with_filter(
                query=cleaned_name,
                first_name=first_name,
                full_name=cleaned_name,
                location_text=self.config.ALBERTA_TEXT,
                lat=self.config.ALBERTA_LAT,
                lng=self.config.ALBERTA_LNG,
                filter_desc="Full name + Alberta"
            )
            if match:
                return self._create_result(full_name, match, method)

            # Step 3: Last Name + Alberta filter
            # Skip for very common short last names as they return too many results
            if not is_short_lastname:
                match, method = self._search_with_filter(
                    query=last_name,
                    first_name=first_name,
                    full_name=cleaned_name,
                    location_text=self.config.ALBERTA_TEXT,
                    lat=self.config.ALBERTA_LAT,
                    lng=self.config.ALBERTA_LNG,
                    filter_desc="Last name + Alberta"
                )
                if match:
                    return self._create_result(full_name, match, method)

            # Step 4: Full Name + Canada filter (for players outside Alberta)
            match, method = self._search_with_filter(
                query=cleaned_name,
                first_name=first_name,
                full_name=cleaned_name,
                location_text=self.config.CANADA_TEXT,
                lat=self.config.CANADA_LAT,
                lng=self.config.CANADA_LNG,
                filter_desc="Full name + Canada"
            )
            if match:
                return self._create_result(full_name, match, method)

            # Step 5: Last Name + Canada filter
            if not is_short_lastname:
                match, method = self._search_with_filter(
                    query=last_name,
                    first_name=first_name,
                    full_name=cleaned_name,
                    location_text=self.config.CANADA_TEXT,
                    lat=self.config.CANADA_LAT,
                    lng=self.config.CANADA_LNG,
                    filter_desc="Last name + Canada"
                )
                if match:
                    return self._create_result(full_name, match, method)

            # Step 6: Last Name + No filter (global search)
            if not is_short_lastname:
                match, method = self._search_with_filter(
                    query=last_name,
                    first_name=first_name,
                    full_name=cleaned_name,
                    location_text=None,
                    lat=None,
                    lng=None,
                    filter_desc="Last name + No filter"
                )
                if match:
                    return self._create_result(full_name, match, method)

            # Step 6b: Full Name + No filter (last resort for short last names)
            match, method = self._search_with_filter(
                query=cleaned_name,
                first_name=first_name,
                full_name=cleaned_name,
                location_text=None,
                lat=None,
                lng=None,
                filter_desc="Full name + No filter"
            )
            if match:
                return self._create_result(full_name, match, method)

        except TokenExpiredError:
            # Re-raise token errors to halt execution
            raise

        except DUPRAPIError as e:
            debug_log(f"API error searching for '{full_name}': {e}")

        # Step 7: Fallback
        print(f"Warning: Player '{full_name}' not found, using default rating", file=sys.stderr)
        return SearchResult(
            name=full_name,
            rating=self.config.DEFAULT_RATING,
            player_id=None,
            profile_url=None,
            found=False,
            search_method="Default (player not found)"
        )

    def _create_result(self, search_name: str, player: DUPRPlayer, method: str) -> SearchResult:
        """Create a SearchResult from a matched player and register in cache."""
        rating = player.best_rating
        if rating is None:
            rating = self.config.DEFAULT_RATING
            debug_log(f"Player '{player.full_name}' has no rating, using default")
        
        # Register the match for future lookups
        self._register_match(search_name, player)

        return SearchResult(
            name=search_name,
            rating=rating,
            player_id=player.id,
            profile_url=player.profile_url,
            found=True,
            search_method=method
        )
    
    def _register_match(self, search_name: str, player: DUPRPlayer) -> None:
        """Register a successful match in the player registry.
        
        Args:
            search_name: The name used to search for the player.
            player: The matched DUPR player.
        """
        # Only register if the search name differs from the DUPR name
        # (no point caching exact matches)
        search_normalized = self._normalize_name(search_name)
        dupr_normalized = self._normalize_name(player.full_name)
        
        if search_normalized != dupr_normalized:
            self.player_registry.register(
                search_name=search_name,
                dupr_id=player.dupr_id,
                dupr_name=player.full_name,
                rating=player.best_rating,
                location=player.short_address
            )
    
    def save_registry(self) -> None:
        """Save the player registry to disk."""
        self.player_registry.save()
