"""Tests for player search module."""

import pytest
from unittest.mock import Mock, MagicMock
from dataclasses import dataclass

from src.config import Config, PlayerOverride
from src.dupr_client import DUPRPlayer, PlayerRating, DUPRAPIError
from src.player_search import PlayerSearcher, SearchResult, SHORT_COMMON_LASTNAMES


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


@pytest.fixture
def searcher(mock_config, mock_client):
    """Create a PlayerSearcher with mocked dependencies."""
    return PlayerSearcher(mock_config, mock_client)


def make_player(id: int, full_name: str, doubles: float = 3.5) -> DUPRPlayer:
    """Helper to create test players."""
    parts = full_name.split()
    return DUPRPlayer(
        id=id,
        full_name=full_name,
        first_name=parts[0] if parts else "",
        last_name=parts[-1] if len(parts) > 1 else parts[0] if parts else "",
        short_address="Edmonton, AB",
        ratings=PlayerRating(
            singles=None,
            doubles=doubles,
            singles_verified=False,
            doubles_verified=True
        ),
        dupr_id=f"TEST{id}"
    )


class TestNameCleaning:
    """Tests for name cleaning functionality."""

    def test_cleans_guest_marker_parentheses_g(self, searcher):
        """Test removing (G) guest marker."""
        assert searcher._clean_name("Colin Ng (G)") == "Colin Ng"
        assert searcher._clean_name("Colin Ng (g)") == "Colin Ng"

    def test_cleans_guest_marker_full_word(self, searcher):
        """Test removing (Guest) marker."""
        assert searcher._clean_name("Colin Ng (Guest)") == "Colin Ng"

    def test_cleans_trailing_parenthetical(self, searcher):
        """Test removing other trailing annotations."""
        assert searcher._clean_name("John Doe (new)") == "John Doe"
        assert searcher._clean_name("John Doe (visiting)") == "John Doe"

    def test_preserves_clean_names(self, searcher):
        """Test that clean names are unchanged."""
        assert searcher._clean_name("Colin Ng") == "Colin Ng"
        assert searcher._clean_name("John Doe") == "John Doe"

    def test_handles_multiple_spaces(self, searcher):
        """Test handling of whitespace."""
        assert searcher._clean_name("  Colin Ng (G)  ") == "Colin Ng"


class TestShortCommonLastNames:
    """Tests for short common last name handling."""

    def test_ng_is_short_common(self, searcher):
        """Test that Ng is recognized as short common."""
        assert searcher._is_short_common_lastname("Ng")
        assert searcher._is_short_common_lastname("ng")
        assert searcher._is_short_common_lastname("NG")

    def test_hu_is_short_common(self, searcher):
        """Test that Hu is recognized as short common."""
        assert searcher._is_short_common_lastname("Hu")

    def test_wong_is_short_common(self, searcher):
        """Test that Wong is recognized as short common."""
        assert searcher._is_short_common_lastname("Wong")

    def test_regular_names_not_short_common(self, searcher):
        """Test that regular names are not flagged."""
        assert not searcher._is_short_common_lastname("Smith")
        assert not searcher._is_short_common_lastname("Johnson")
        assert not searcher._is_short_common_lastname("Anderson")

    def test_all_defined_short_names(self):
        """Test that expected names are in the set."""
        expected = {'ng', 'hu', 'wong', 'li', 'wu', 'chen', 'wang'}
        for name in expected:
            assert name in SHORT_COMMON_LASTNAMES


class TestOverrideSearch:
    """Tests for player override functionality."""

    def test_returns_override_when_exists(self, mock_config, mock_client):
        """Test that override is returned when player is in overrides."""
        mock_config.overrides = {
            "john doe": PlayerOverride(
                name="John Doe",
                rating=4.5,
                reason="Test override"
            )
        }
        searcher = PlayerSearcher(mock_config, mock_client)

        result = searcher.search_player("John Doe")

        assert result.found is True
        assert result.rating == 4.5
        assert "Override" in result.search_method
        mock_client.search_players.assert_not_called()

    def test_override_case_insensitive(self, mock_config, mock_client):
        """Test that override lookup is case-insensitive."""
        mock_config.overrides = {
            "john doe": PlayerOverride(
                name="John Doe",
                rating=4.5,
                reason="Test"
            )
        }
        searcher = PlayerSearcher(mock_config, mock_client)

        result = searcher.search_player("JOHN DOE")
        assert result.found is True
        assert result.rating == 4.5

    def test_override_with_cleaned_name(self, mock_config, mock_client):
        """Test that override works with cleaned name (guest marker removed)."""
        mock_config.overrides = {
            "colin ng": PlayerOverride(
                name="Colin Ng",
                rating=3.8,
                reason="Test"
            )
        }
        searcher = PlayerSearcher(mock_config, mock_client)

        result = searcher.search_player("Colin Ng (G)")
        assert result.found is True
        assert result.rating == 3.8


class TestSearchAlgorithm:
    """Tests for the search algorithm."""

    def test_unique_match_first_search(self, searcher, mock_client):
        """Test that unique match on first search returns immediately."""
        player = make_player(1, "John Doe", 4.0)
        mock_client.search_players.return_value = [player]

        result = searcher.search_player("John Doe")

        assert result.found is True
        assert result.rating == 4.0
        assert result.player_id == 1
        # Should have searched once with full name + Alberta
        assert mock_client.search_players.call_count == 1

    def test_first_name_match_in_results(self, searcher, mock_client):
        """Test matching by first name within multiple results."""
        players = [
            make_player(1, "John Doe", 4.0),
            make_player(2, "Jane Doe", 3.5),
            make_player(3, "Bob Doe", 3.0)
        ]
        mock_client.search_players.return_value = players

        result = searcher.search_player("John Doe")

        assert result.found is True
        assert result.rating == 4.0
        assert result.player_id == 1

    def test_fallback_search_sequence(self, searcher, mock_client):
        """Test that search falls back through the sequence."""
        # For regular names: Full Alberta, Last Alberta, Full Canada, Last Canada, Last none, Full none
        mock_client.search_players.side_effect = [
            [],  # Full name + Alberta
            [],  # Last name + Alberta
            [],  # Full name + Canada
            [],  # Last name + Canada
            [],  # Last name + No filter
            [make_player(1, "John Doe", 4.0)]  # Full name + No filter
        ]

        result = searcher.search_player("John Doe")

        assert result.found is True
        assert result.rating == 4.0
        assert mock_client.search_players.call_count == 6

    def test_default_rating_when_not_found(self, searcher, mock_client):
        """Test that default rating is used when player not found."""
        mock_client.search_players.return_value = []

        result = searcher.search_player("Unknown Player")

        assert result.found is False
        assert result.rating == 2.5
        assert result.profile_url is None
        assert "Default" in result.search_method

    def test_api_error_returns_default(self, searcher, mock_client):
        """Test that API errors result in default rating."""
        mock_client.search_players.side_effect = DUPRAPIError("Network error")

        result = searcher.search_player("John Doe")

        assert result.found is False
        assert result.rating == 2.5

    def test_search_with_guest_marker(self, searcher, mock_client):
        """Test that guest marker is cleaned before search."""
        player = make_player(1, "Colin Ng", 3.5)
        mock_client.search_players.return_value = [player]

        result = searcher.search_player("Colin Ng (G)")

        assert result.found is True
        # Verify the cleaned name was used in the search
        call_args = mock_client.search_players.call_args
        assert call_args[1]['query'] == "Colin Ng"

    def test_short_lastname_skips_lastname_only_search(self, searcher, mock_client):
        """Test that short common last names skip last-name-only searches."""
        # For short last names: Full Alberta, Full Canada, Full none (skips Last-name searches)
        mock_client.search_players.side_effect = [
            [],  # Full name + Alberta
            [],  # Full name + Canada
            [make_player(1, "Colin Ng", 3.5)]  # Full name + No filter
        ]

        result = searcher.search_player("Colin Ng")

        assert result.found is True
        # Should have only done 3 searches (no last-name-only searches)
        assert mock_client.search_players.call_count == 3


class TestFirstNameMatching:
    """Tests for first name matching logic."""

    def test_exact_match(self, searcher, mock_client):
        """Test exact first name match."""
        players = [make_player(1, "John Smith", 4.0)]
        mock_client.search_players.return_value = players

        result = searcher.search_player("John Smith")
        assert result.found is True

    def test_substring_match_api_contains_search(self, searcher, mock_client):
        """Test that 'Rob' matches 'Robert'."""
        players = [make_player(1, "Robert Smith", 4.0)]
        mock_client.search_players.return_value = players

        result = searcher.search_player("Rob Smith")
        assert result.found is True
        assert result.player_id == 1

    def test_substring_match_search_contains_api(self, searcher, mock_client):
        """Test that 'Robert' matches 'Rob'."""
        players = [make_player(1, "Rob Smith", 4.0)]
        mock_client.search_players.return_value = players

        result = searcher.search_player("Robert Smith")
        assert result.found is True

    def test_case_insensitive_first_name(self, searcher, mock_client):
        """Test case-insensitive first name matching."""
        players = [make_player(1, "JOHN Smith", 4.0)]
        mock_client.search_players.return_value = players

        result = searcher.search_player("john Smith")
        assert result.found is True


class TestSearchResultProperties:
    """Tests for SearchResult properties."""

    def test_profile_url_set_when_found(self, searcher, mock_client):
        """Test that profile URL is set when player is found."""
        player = make_player(12345, "John Doe", 4.0)
        mock_client.search_players.return_value = [player]

        result = searcher.search_player("John Doe")

        assert result.profile_url is not None
        assert "12345" in result.profile_url

    def test_search_method_describes_how_found(self, searcher, mock_client):
        """Test that search method describes the search that found the player."""
        mock_client.search_players.side_effect = [
            [],  # Full name + Alberta fails
            [make_player(1, "John Doe", 4.0)]  # Last name + Alberta succeeds
        ]

        result = searcher.search_player("John Doe")

        assert "Alberta" in result.search_method
        assert "Last name" in result.search_method

    def test_preserves_original_name_in_result(self, searcher, mock_client):
        """Test that original name (with guest marker) is preserved in result."""
        player = make_player(1, "Colin Ng", 3.5)
        mock_client.search_players.return_value = [player]

        result = searcher.search_player("Colin Ng (G)")

        # The original name should be preserved
        assert result.name == "Colin Ng (G)"
