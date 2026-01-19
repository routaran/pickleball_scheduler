"""Tests for DUPR API client module."""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
import requests

from src.config import Config
from src.dupr_client import (
    DUPRClient,
    DUPRPlayer,
    PlayerRating,
    DUPRAPIError,
    TokenExpiredError,
    RateLimitError
)


@pytest.fixture
def mock_config():
    """Create a mock config for testing."""
    config = Mock(spec=Config)
    config.token = "test_token"
    config.API_URL = "https://api.dupr.gg/player/v1.0/search"
    config.REQUEST_DELAY_MS = 0  # No delay in tests
    config.RETRY_COUNT = 3
    config.RETRY_DELAY_S = 0
    config.RATE_LIMIT_WAIT_S = 0
    return config


@pytest.fixture
def client(mock_config):
    """Create a DUPRClient with mocked config."""
    return DUPRClient(mock_config)


class TestSearchPlayers:
    """Tests for search_players method."""

    def test_successful_search(self, client):
        """Test successful player search."""
        response_data = {
            "status": "SUCCESS",
            "result": {
                "hits": [
                    {
                        "id": 12345,
                        "fullName": "John Doe",
                        "shortAddress": "Edmonton, AB",
                        "ratings": {
                            "singles": "3.5",
                            "doubles": "4.0",
                            "singlesVerified": "NR",
                            "doublesVerified": "4.0"
                        },
                        "duprId": "ABC123"
                    }
                ]
            }
        }

        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = response_data
            mock_post.return_value = mock_response

            players = client.search_players("John Doe")

            assert len(players) == 1
            assert players[0].full_name == "John Doe"
            assert players[0].ratings.doubles == 4.0
            assert players[0].id == 12345

    def test_parses_nr_ratings_as_none(self, client):
        """Test that 'NR' ratings are parsed as None."""
        response_data = {
            "status": "SUCCESS",
            "result": {
                "hits": [
                    {
                        "id": 12345,
                        "fullName": "John Doe",
                        "shortAddress": "Edmonton, AB",
                        "ratings": {
                            "singles": "NR",
                            "doubles": "NR",
                            "singlesVerified": "NR",
                            "doublesVerified": "NR"
                        },
                        "duprId": "ABC123"
                    }
                ]
            }
        }

        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = response_data
            mock_post.return_value = mock_response

            players = client.search_players("John")

            assert players[0].ratings.singles is None
            assert players[0].ratings.doubles is None

    def test_includes_location_filter(self, client):
        """Test that location filter is included in request."""
        response_data = {"status": "SUCCESS", "result": {"hits": []}}

        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = response_data
            mock_post.return_value = mock_response

            client.search_players(
                "John",
                location_text="Alberta, Canada",
                lat=53.9,
                lng=-116.5
            )

            call_args = mock_post.call_args
            payload = call_args[1]['json']
            assert payload['filter']['locationText'] == "Alberta, Canada"
            assert payload['filter']['lat'] == 53.9

    def test_authorization_header(self, client):
        """Test that auth header is included."""
        response_data = {"status": "SUCCESS", "result": {"hits": []}}

        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = response_data
            mock_post.return_value = mock_response

            client.search_players("John")

            call_args = mock_post.call_args
            headers = call_args[1]['headers']
            assert "Bearer test_token" in headers['Authorization']


class TestErrorHandling:
    """Tests for error handling."""

    def test_raises_token_expired_on_401(self, client):
        """Test that TokenExpiredError is raised on 401."""
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.raise_for_status.side_effect = requests.HTTPError()
            mock_post.return_value = mock_response

            with pytest.raises(TokenExpiredError):
                client.search_players("John")

    def test_retries_on_network_error(self, client):
        """Test that network errors trigger retries."""
        with patch('requests.post') as mock_post:
            # First two calls fail, third succeeds
            mock_response_ok = Mock()
            mock_response_ok.status_code = 200
            mock_response_ok.json.return_value = {
                "status": "SUCCESS",
                "result": {"hits": []}
            }

            mock_post.side_effect = [
                requests.RequestException("Network error"),
                requests.RequestException("Network error"),
                mock_response_ok
            ]

            players = client.search_players("John")
            assert players == []
            assert mock_post.call_count == 3

    def test_raises_api_error_after_max_retries(self, client):
        """Test that DUPRAPIError is raised after max retries."""
        with patch('requests.post') as mock_post:
            mock_post.side_effect = requests.RequestException("Network error")

            with pytest.raises(DUPRAPIError):
                client.search_players("John")

    def test_retries_on_rate_limit(self, client):
        """Test that 429 responses trigger rate limit wait and retry."""
        with patch('requests.post') as mock_post:
            mock_response_429 = Mock()
            mock_response_429.status_code = 429

            mock_response_ok = Mock()
            mock_response_ok.status_code = 200
            mock_response_ok.json.return_value = {
                "status": "SUCCESS",
                "result": {"hits": []}
            }

            mock_post.side_effect = [mock_response_429, mock_response_ok]

            players = client.search_players("John")
            assert mock_post.call_count == 2


class TestPlayerParsing:
    """Tests for player data parsing."""

    def test_parses_name_into_parts(self, client):
        """Test that full name is parsed into first/last."""
        response_data = {
            "status": "SUCCESS",
            "result": {
                "hits": [
                    {
                        "id": 1,
                        "fullName": "John Michael Doe",
                        "shortAddress": "",
                        "ratings": {"singles": "NR", "doubles": "NR",
                                   "singlesVerified": "NR", "doublesVerified": "NR"},
                        "duprId": "X"
                    }
                ]
            }
        }

        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = response_data
            mock_post.return_value = mock_response

            players = client.search_players("John")

            assert players[0].first_name == "John"
            assert players[0].last_name == "Doe"

    def test_returns_empty_on_failed_status(self, client):
        """Test that empty list is returned on non-SUCCESS status."""
        response_data = {"status": "FAILED", "error": "Something went wrong"}

        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = response_data
            mock_post.return_value = mock_response

            players = client.search_players("John")
            assert players == []


class TestDUPRPlayerProperties:
    """Tests for DUPRPlayer dataclass."""

    def test_profile_url(self):
        """Test profile URL generation."""
        player = DUPRPlayer(
            id=12345,
            full_name="John Doe",
            first_name="John",
            last_name="Doe",
            short_address="Edmonton",
            ratings=PlayerRating(None, None, False, False),
            dupr_id="ABC"
        )
        assert player.profile_url == "https://dashboard.dupr.com/dashboard/player/12345"

    def test_best_rating_prefers_doubles(self):
        """Test that best_rating prefers doubles over singles."""
        player = DUPRPlayer(
            id=1,
            full_name="John",
            first_name="John",
            last_name="Doe",
            short_address="",
            ratings=PlayerRating(singles=3.0, doubles=4.0, singles_verified=True, doubles_verified=True),
            dupr_id="X"
        )
        assert player.best_rating == 4.0

    def test_best_rating_falls_back_to_singles(self):
        """Test that best_rating uses singles when no doubles."""
        player = DUPRPlayer(
            id=1,
            full_name="John",
            first_name="John",
            last_name="Doe",
            short_address="",
            ratings=PlayerRating(singles=3.0, doubles=None, singles_verified=True, doubles_verified=False),
            dupr_id="X"
        )
        assert player.best_rating == 3.0

    def test_best_rating_none_when_no_ratings(self):
        """Test that best_rating is None when no ratings available."""
        player = DUPRPlayer(
            id=1,
            full_name="John",
            first_name="John",
            last_name="Doe",
            short_address="",
            ratings=PlayerRating(singles=None, doubles=None, singles_verified=False, doubles_verified=False),
            dupr_id="X"
        )
        assert player.best_rating is None
