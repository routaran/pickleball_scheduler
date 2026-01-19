"""Tests for game types module."""

import pytest
from pathlib import Path
from tempfile import NamedTemporaryFile

from src.game_types import (
    parse_dupr_ladder_players,
    parse_partner_dupr_teams,
    calculate_team_rating,
    Team,
    GameType
)


class TestParseDUPRLadderPlayers:
    """Tests for DUPR Ladder player list parsing."""

    def test_parses_player_names(self):
        """Test parsing player names from file."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("John Doe\n")
            f.write("Jane Smith\n")
            f.write("Bob Wilson\n")
            f.flush()

            players = parse_dupr_ladder_players(Path(f.name))
            assert len(players) == 3
            assert "John Doe" in players
            assert "Jane Smith" in players
            assert "Bob Wilson" in players

    def test_skips_empty_lines(self):
        """Test that empty lines are skipped."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("John Doe\n")
            f.write("\n")
            f.write("Jane Smith\n")
            f.write("   \n")
            f.flush()

            players = parse_dupr_ladder_players(Path(f.name))
            assert len(players) == 2

    def test_strips_whitespace(self):
        """Test that whitespace is stripped from names."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("  John Doe  \n")
            f.write("Jane Smith\n")
            f.flush()

            players = parse_dupr_ladder_players(Path(f.name))
            assert players[0] == "John Doe"


class TestParsePartnerDUPRTeams:
    """Tests for Partner DUPR team list parsing."""

    def test_parses_team_pairs(self):
        """Test parsing team pairs from file."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("John Doe / Jane Smith\n")
            f.write("Bob Wilson / Alice Brown\n")
            f.flush()

            teams = parse_partner_dupr_teams(Path(f.name))
            assert len(teams) == 2
            assert teams[0].player1 == "John Doe"
            assert teams[0].player2 == "Jane Smith"
            assert teams[1].player1 == "Bob Wilson"
            assert teams[1].player2 == "Alice Brown"

    def test_skips_invalid_lines(self):
        """Test that lines without / separator are skipped."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("John Doe / Jane Smith\n")
            f.write("Invalid Line Without Separator\n")
            f.write("Bob Wilson / Alice Brown\n")
            f.flush()

            teams = parse_partner_dupr_teams(Path(f.name))
            assert len(teams) == 2

    def test_skips_empty_lines(self):
        """Test that empty lines are skipped."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("John Doe / Jane Smith\n")
            f.write("\n")
            f.write("Bob Wilson / Alice Brown\n")
            f.flush()

            teams = parse_partner_dupr_teams(Path(f.name))
            assert len(teams) == 2

    def test_strips_whitespace_from_names(self):
        """Test that whitespace is stripped from player names."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("  John Doe  /  Jane Smith  \n")
            f.flush()

            teams = parse_partner_dupr_teams(Path(f.name))
            assert teams[0].player1 == "John Doe"
            assert teams[0].player2 == "Jane Smith"


class TestCalculateTeamRating:
    """Tests for team rating calculation."""

    def test_formula_with_different_ratings(self):
        """Test the 35%/65% formula with different ratings."""
        # Higher = 4.0, Lower = 3.0
        # Expected: 0.35 * 4.0 + 0.65 * 3.0 = 1.4 + 1.95 = 3.35
        result = calculate_team_rating(4.0, 3.0)
        assert result == 3.35

    def test_formula_order_independent(self):
        """Test that order of arguments doesn't matter."""
        result1 = calculate_team_rating(4.0, 3.0)
        result2 = calculate_team_rating(3.0, 4.0)
        assert result1 == result2

    def test_equal_ratings(self):
        """Test with equal ratings."""
        result = calculate_team_rating(3.5, 3.5)
        assert result == 3.5

    def test_real_world_example(self):
        """Test with realistic DUPR ratings."""
        # Two players: 4.2 and 3.8
        # Expected: 0.35 * 4.2 + 0.65 * 3.8 = 1.47 + 2.47 = 3.94
        result = calculate_team_rating(4.2, 3.8)
        assert result == 3.94


class TestTeamDataclass:
    """Tests for Team dataclass."""

    def test_players_property(self):
        """Test the players tuple property."""
        team = Team(player1="John", player2="Jane")
        assert team.players == ("John", "Jane")


class TestGameTypeEnum:
    """Tests for GameType enum."""

    def test_game_type_values(self):
        """Test that game types have expected values."""
        assert GameType.DUPR_LADDER.value == "dupr_ladder"
        assert GameType.PARTNER_DUPR.value == "partner_dupr"
