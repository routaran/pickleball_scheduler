"""Tests verifying exact full name matching in player search.

These tests verify the fix for the bug where players like Colin Ng, June Hu,
and Ken Wong were not found even though they appeared in API results. The root
cause was that _find_unique_match only filtered by first name, not full name.
"""

import pytest
from unittest.mock import Mock
from dataclasses import dataclass

from src.config import Config, PlayerOverride
from src.dupr_client import DUPRPlayer, PlayerRating, DUPRAPIError
from src.player_search import PlayerSearcher, SearchResult, SHORT_COMMON_LASTNAMES
from src.player_registry import PlayerRegistry, reset_registry


@pytest.fixture(autouse=True)
def reset_global_registry():
    """Reset the global registry before each test to ensure test isolation."""
    reset_registry()
    yield
    reset_registry()


@pytest.fixture
def empty_registry(tmp_path):
    """Create an empty player registry that doesn't load from file."""
    # Use a non-existent file path so the registry starts empty
    empty_file = tmp_path / "empty_registry.json"
    return PlayerRegistry(registry_file=str(empty_file))


@pytest.fixture
def mock_config():
    """Create a mock config for testing."""
    config = Mock(spec=Config)
    config.overrides = {}
    config.ALBERTA_TEXT = "Alberta, Canada"
    config.ALBERTA_LAT = 53.9
    config.ALBERTA_LNG = -116.5
    config.CANADA_TEXT = "Canada"
    config.CANADA_LAT = 56.1
    config.CANADA_LNG = -106.3
    config.DEFAULT_RATING = 2.5
    return config


@pytest.fixture
def mock_client():
    """Create a mock DUPR client."""
    return Mock()


def make_player(id: int, full_name: str, doubles: float = 3.5, address: str = "Edmonton, AB") -> DUPRPlayer:
    """Helper to create test players matching DUPR API response structure."""
    parts = full_name.split()
    first_name = parts[0] if parts else ""
    last_name = parts[-1] if len(parts) > 1 else parts[0] if parts else ""

    return DUPRPlayer(
        id=id,
        full_name=full_name,
        first_name=first_name,
        last_name=last_name,
        short_address=address,
        ratings=PlayerRating(
            singles=None,
            doubles=doubles,
            singles_verified=False,
            doubles_verified=True
        ),
        dupr_id=f"TEST{id}"
    )


class TestExactFullNameMatching:
    """Tests for exact full name matching - the fix for the Colin Ng bug."""

    def test_colin_ng_found_among_multiple_colins(self, mock_config, mock_client, empty_registry):
        """Colin Ng should be found even when multiple Colins are returned."""
        players = [
            make_player(1, "Colin Ng", 3.5, "Edmonton, AB"),
            make_player(2, "Colin Wong", 4.0, "Calgary, AB"),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("Colin Ng")

        assert result.found is True
        assert result.rating == 3.5
        assert result.player_id == 1
        assert "Full name + Alberta" in result.search_method

    def test_june_hu_found_among_multiple_junes(self, mock_config, mock_client, empty_registry):
        """June Hu should be found even when multiple Junes are returned."""
        players = [
            make_player(3, "June Hu", 3.2, "Edmonton, AB"),
            make_player(4, "June Li", 2.8, "Calgary, AB"),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("June Hu")

        assert result.found is True
        assert result.rating == 3.2
        assert result.player_id == 3

    def test_ken_wong_found_with_similar_names(self, mock_config, mock_client, empty_registry):
        """Ken Wong should be found even with Kenneth Wong in results."""
        players = [
            make_player(5, "Ken Wong", 4.1, "Edmonton, AB"),
            make_player(6, "Ken Chen", 3.5, "Calgary, AB"),
            make_player(7, "Kenneth Wong", 3.0, "Edmonton, AB"),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("Ken Wong")

        assert result.found is True
        assert result.rating == 4.1
        assert result.player_id == 5


class TestFullNameMatchingPriority:
    """Tests verifying that full name matching takes priority."""

    def test_exact_match_preferred_over_first_name_match(self, mock_config, mock_client, empty_registry):
        """Exact full name match should be preferred over first name match."""
        players = [
            make_player(1, "John Smith", 3.0),
            make_player(2, "John Doe", 4.0),  # Exact match
            make_player(3, "Johnny Doe", 3.5),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("John Doe")

        assert result.found is True
        assert result.player_id == 2  # Should find exact match
        assert result.rating == 4.0

    def test_case_insensitive_full_name_match(self, mock_config, mock_client, empty_registry):
        """Full name matching should be case-insensitive."""
        players = [
            make_player(1, "COLIN NG", 3.5),
            make_player(2, "Colin Wong", 4.0),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("colin ng")

        assert result.found is True
        assert result.player_id == 1

    def test_falls_back_to_first_name_when_no_exact_match(self, mock_config, mock_client, empty_registry):
        """Should fall back to first name matching when no exact match exists."""
        # API returns "Rob Smith" when searching for "Robert Smith"
        players = [
            make_player(1, "Rob Smith", 3.5),  # Rob is substring of Robert
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("Robert Smith")

        # No exact match for "Robert Smith", but "Rob" matches via first name
        assert result.found is True
        assert result.player_id == 1


class TestNoMatchScenarios:
    """Tests for scenarios where no match should be found."""

    def test_no_match_when_name_not_in_results(self, mock_config, mock_client, empty_registry):
        """Should not find a match when the name is not in results at all."""
        players = [
            make_player(1, "Alice Wong", 3.5),
            make_player(2, "Bob Chen", 4.0),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("Colin Ng")

        # No Colin in results, and no Ng either
        assert result.found is False
        assert result.rating == 2.5  # Default rating

    def test_no_match_ambiguous_first_names_no_exact(self, mock_config, mock_client, empty_registry):
        """Should not match when multiple first names match but no exact full name."""
        players = [
            make_player(1, "John Smith", 3.5),
            make_player(2, "John Chen", 4.0),
            make_player(3, "John Lee", 3.0),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("John Doe")  # No "John Doe" in results

        # Multiple Johns but none is "John Doe"
        assert result.found is False


class TestMultipleExactMatches:
    """Tests for edge case of multiple exact matches (rare but possible)."""

    def test_multiple_exact_matches_returns_first(self, mock_config, mock_client, empty_registry):
        """When multiple exact matches exist, return the first one."""
        # Unlikely scenario but possible: two players with same name
        players = [
            make_player(1, "John Doe", 3.5, "Edmonton, AB"),
            make_player(2, "John Doe", 4.0, "Calgary, AB"),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)
        result = searcher.search_player("John Doe")

        assert result.found is True
        # Should return the first one
        assert result.player_id == 1


class TestSearchFlowWithFix:
    """Tests that trace the search flow with the fix applied."""

    def test_trace_colin_ng_search_with_fix(self, mock_config, mock_client, empty_registry):
        """Trace the search flow for Colin Ng to verify the fix."""
        players = [
            make_player(1, "Colin Ng", 3.5, "Edmonton, AB"),
            make_player(2, "Colin Lee", 4.0, "Edmonton, AB"),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)

        # Verify the matching logic
        match = searcher._find_unique_match(players, "Colin", "Colin Ng")
        assert match is not None
        assert match.full_name == "Colin Ng"

        # Verify the full search
        result = searcher.search_player("Colin Ng")
        assert result.found is True
        assert result.rating == 3.5
        assert result.search_method == "Full name + Alberta"

    def test_trace_guest_marker_cleaning_with_exact_match(self, mock_config, mock_client, empty_registry):
        """Test that guest markers are cleaned and exact match still works."""
        players = [
            make_player(1, "Colin Ng", 3.5, "Edmonton, AB"),
            make_player(2, "Colin Wong", 4.0, "Calgary, AB"),
        ]
        mock_client.search_players.return_value = players

        searcher = PlayerSearcher(mock_config, mock_client, empty_registry)

        # Search with guest marker
        result = searcher.search_player("Colin Ng (G)")

        assert result.found is True
        assert result.rating == 3.5
        assert result.player_id == 1
        # Original name is preserved in result
        assert result.name == "Colin Ng (G)"
