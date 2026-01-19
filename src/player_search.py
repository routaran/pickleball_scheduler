"""Player search algorithm for finding DUPR ratings."""

import re
import sys
from dataclasses import dataclass
from typing import Optional, List, Tuple

from .config import Config, debug_log
from .dupr_client import DUPRClient, DUPRPlayer, DUPRAPIError, TokenExpiredError


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

    def __init__(self, config: Config, client: DUPRClient):
        self.config = config
        self.client = client

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
        """Check if the API first name contains the search first name."""
        search_normalized = self._normalize_name(search_first)
        api_normalized = self._normalize_name(api_first)
        return search_normalized in api_normalized or api_normalized in search_normalized

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
            # Multiple exact matches - can't determine which one, return first
            return exact_matches[0]

        # Fallback: First name matching (for cases where full name doesn't exactly match)
        matches = [
            p for p in players
            if self._first_name_matches(first_name, p.first_name)
        ]

        if len(matches) == 1:
            debug_log(f"Found unique first name match: {matches[0].full_name}")
            return matches[0]

        debug_log(f"No unique match found: {len(matches)} first name matches for '{first_name}'")
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
        1. Check player_overrides.json (using original and cleaned names)
        2. Full Name + Alberta filter
        3. Last Name + Alberta filter (skip for very common short last names)
        4. Full Name + Canada filter
        5. Last Name + Canada filter
        6. Last Name + No filter
        7. Fallback to default rating
        """
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
        """Create a SearchResult from a matched player."""
        rating = player.best_rating
        if rating is None:
            rating = self.config.DEFAULT_RATING
            debug_log(f"Player '{player.full_name}' has no rating, using default")

        return SearchResult(
            name=search_name,
            rating=rating,
            player_id=player.id,
            profile_url=player.profile_url,
            found=True,
            search_method=method
        )
