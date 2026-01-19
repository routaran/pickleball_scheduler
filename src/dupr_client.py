"""DUPR API client for player lookups."""

import json
import sys
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
import requests

from .config import Config, debug_log


@dataclass
class PlayerRating:
    """Player rating information from DUPR."""
    singles: Optional[float]
    doubles: Optional[float]
    singles_verified: bool
    doubles_verified: bool


@dataclass
class DUPRPlayer:
    """Player information from DUPR API."""
    id: int
    full_name: str
    first_name: str
    last_name: str
    short_address: str
    ratings: PlayerRating
    dupr_id: str

    @property
    def profile_url(self) -> str:
        """Get the URL to the player's DUPR profile."""
        return f"https://dashboard.dupr.com/dashboard/player/{self.id}"

    @property
    def best_rating(self) -> Optional[float]:
        """Get the best available rating (prefer doubles)."""
        if self.ratings.doubles is not None:
            return self.ratings.doubles
        return self.ratings.singles


class DUPRAPIError(Exception):
    """Error from DUPR API."""
    pass


class TokenExpiredError(DUPRAPIError):
    """Auth token has expired."""
    pass


class RateLimitError(DUPRAPIError):
    """Rate limit exceeded."""
    pass


class DUPRClient:
    """Client for DUPR player search API."""

    def __init__(self, config: Config):
        self.config = config
        self._last_request_time = 0

    def _rate_limit_wait(self) -> None:
        """Wait to respect rate limiting."""
        elapsed = time.time() - self._last_request_time
        wait_time = (self.config.REQUEST_DELAY_MS / 1000) - elapsed
        if wait_time > 0:
            debug_log(f"Rate limiting: waiting {wait_time:.2f}s")
            time.sleep(wait_time)

    def _make_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make an API request with retry logic."""
        self._rate_limit_wait()

        headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': f'Bearer {self.config.token}',
            'Origin': 'https://dashboard.dupr.com',
            'Referer': 'https://dashboard.dupr.com/',
        }

        debug_log(f"API Request: {json.dumps(payload)}")

        for attempt in range(self.config.RETRY_COUNT):
            try:
                self._last_request_time = time.time()
                response = requests.post(
                    self.config.API_URL,
                    headers=headers,
                    json=payload,
                    timeout=30
                )

                if response.status_code == 401:
                    raise TokenExpiredError("Auth token expired - manual refresh required")

                if response.status_code == 429:
                    debug_log(f"Rate limited, waiting {self.config.RATE_LIMIT_WAIT_S}s")
                    time.sleep(self.config.RATE_LIMIT_WAIT_S)
                    continue

                response.raise_for_status()
                data = response.json()
                debug_log(f"API Response: {json.dumps(data)}")
                return data

            except requests.RequestException as e:
                debug_log(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < self.config.RETRY_COUNT - 1:
                    time.sleep(self.config.RETRY_DELAY_S)
                else:
                    raise DUPRAPIError(f"API request failed after {self.config.RETRY_COUNT} attempts: {e}")

        raise DUPRAPIError("Max retries exceeded")

    def search_players(
        self,
        query: str,
        location_text: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None
    ) -> List[DUPRPlayer]:
        """Search for players by name with optional location filter."""
        payload = {
            "limit": 10,
            "offset": 0,
            "query": query,
            "exclude": [],
            "includeUnclaimedPlayers": True,
            "filter": {
                "rating": {}
            }
        }

        if location_text and lat and lng:
            payload["filter"]["lat"] = lat
            payload["filter"]["lng"] = lng
            payload["filter"]["locationText"] = location_text

        response = self._make_request(payload)

        if response.get("status") != "SUCCESS":
            debug_log(f"Search failed: {response}")
            return []

        result = response.get("result", {})
        hits = result.get("hits", [])

        players = []
        for hit in hits:
            ratings_data = hit.get("ratings", {})

            # Parse ratings - handle "NR" as None
            singles = ratings_data.get("singles")
            if singles == "NR" or singles is None:
                singles = None
            else:
                singles = float(singles)

            doubles = ratings_data.get("doubles")
            if doubles == "NR" or doubles is None:
                doubles = None
            else:
                doubles = float(doubles)

            # Parse name into first/last
            full_name = hit.get("fullName", "")
            name_parts = full_name.split()
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[-1] if len(name_parts) > 1 else ""

            player = DUPRPlayer(
                id=hit.get("id"),
                full_name=full_name,
                first_name=first_name,
                last_name=last_name,
                short_address=hit.get("shortAddress", ""),
                ratings=PlayerRating(
                    singles=singles,
                    doubles=doubles,
                    singles_verified=ratings_data.get("singlesVerified") != "NR",
                    doubles_verified=ratings_data.get("doublesVerified") != "NR"
                ),
                dupr_id=hit.get("duprId", "")
            )
            players.append(player)

        debug_log(f"Found {len(players)} players for query '{query}'")
        return players
