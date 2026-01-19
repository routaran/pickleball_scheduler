"""Tests for input_parser module."""

import pytest
from pathlib import Path
from tempfile import NamedTemporaryFile
from unittest.mock import patch
from io import StringIO

from src.input_parser import (
    InputError,
    prompt_game_type,
    read_player_list_interactive,
    parse_ladder_players_from_list,
    parse_partner_teams_from_list,
    parse_partner_teams_from_formatted_list,
    read_players_from_file,
    detect_input_format
)
from src.game_types import GameType, Team


class TestPromptGameType:
    """Tests for game type selection prompt."""

    def test_selects_partner_dupr(self):
        """Test selecting Partner DUPR (option 1)."""
        with patch('builtins.input', return_value='1'):
            result = prompt_game_type()
            assert result == GameType.PARTNER_DUPR

    def test_selects_dupr_ladder(self):
        """Test selecting DUPR Ladder (option 2)."""
        with patch('builtins.input', return_value='2'):
            result = prompt_game_type()
            assert result == GameType.DUPR_LADDER

    def test_reprompts_on_invalid_input(self):
        """Test that invalid input causes re-prompt."""
        inputs = iter(['invalid', '3', '1'])
        with patch('builtins.input', side_effect=lambda _: next(inputs)):
            result = prompt_game_type()
            assert result == GameType.PARTNER_DUPR

    def test_raises_on_eof(self):
        """Test that EOF raises InputError."""
        with patch('builtins.input', side_effect=EOFError):
            with pytest.raises(InputError, match="No game type selection"):
                prompt_game_type()


class TestReadPlayerListInteractive:
    """Tests for interactive player list reading."""

    def test_reads_players_until_empty_line(self):
        """Test reading players until blank line."""
        inputs = iter(['John Doe', 'Jane Smith', ''])
        with patch('builtins.input', side_effect=lambda: next(inputs)):
            players = read_player_list_interactive()
            assert len(players) == 2
            assert 'John Doe' in players
            assert 'Jane Smith' in players

    def test_strips_whitespace(self):
        """Test that whitespace is stripped from names."""
        inputs = iter(['  John Doe  ', 'Jane Smith', ''])
        with patch('builtins.input', side_effect=lambda: next(inputs)):
            players = read_player_list_interactive()
            assert players[0] == 'John Doe'

    def test_raises_on_eof(self):
        """Test that EOF raises InputError."""
        with patch('builtins.input', side_effect=EOFError):
            with pytest.raises(InputError, match="Input cancelled"):
                read_player_list_interactive()

    def test_reprompts_on_empty_input_then_succeeds(self):
        """Test that empty input causes re-prompt and succeeds on valid input."""
        # First attempt: empty, second attempt: valid
        inputs = iter(['', 'John Doe', 'Jane Smith', ''])
        with patch('builtins.input', side_effect=lambda: next(inputs)):
            players = read_player_list_interactive()
            assert len(players) == 2

    def test_reprompts_on_single_player_then_succeeds(self):
        """Test that single player causes re-prompt and succeeds on valid input."""
        # First attempt: single player, second attempt: valid
        inputs = iter(['John Doe', '', 'John Doe', 'Jane Smith', ''])
        with patch('builtins.input', side_effect=lambda: next(inputs)):
            players = read_player_list_interactive()
            assert len(players) == 2


class TestParseLadderPlayersFromList:
    """Tests for ladder player parsing from list."""

    def test_parses_player_names(self):
        """Test parsing player names from list."""
        names = ['John Doe', 'Jane Smith', 'Bob Wilson']
        result = parse_ladder_players_from_list(names)
        assert len(result) == 3
        assert 'John Doe' in result

    def test_filters_empty_strings(self):
        """Test that empty strings are filtered."""
        names = ['John Doe', '', 'Jane Smith', '   ']
        result = parse_ladder_players_from_list(names)
        assert len(result) == 2

    def test_strips_whitespace(self):
        """Test that whitespace is stripped."""
        names = ['  John Doe  ', 'Jane Smith']
        result = parse_ladder_players_from_list(names)
        assert result[0] == 'John Doe'


class TestParsePartnerTeamsFromList:
    """Tests for partner team parsing from sequential names."""

    def test_pairs_sequential_names(self):
        """Test that names are paired sequentially."""
        names = ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown']
        teams, unpaired = parse_partner_teams_from_list(names)
        assert len(teams) == 2
        assert teams[0].player1 == 'John Doe'
        assert teams[0].player2 == 'Jane Smith'
        assert teams[1].player1 == 'Bob Wilson'
        assert teams[1].player2 == 'Alice Brown'
        assert unpaired == []

    def test_handles_odd_number(self):
        """Test handling of odd number of players."""
        names = ['John Doe', 'Jane Smith', 'Bob Wilson']
        teams, unpaired = parse_partner_teams_from_list(names)
        assert len(teams) == 1
        assert len(unpaired) == 1
        assert unpaired[0] == 'Bob Wilson'

    def test_filters_empty_names(self):
        """Test that empty names are filtered before pairing."""
        names = ['John Doe', '', 'Jane Smith', 'Bob Wilson']
        teams, unpaired = parse_partner_teams_from_list(names)
        # After filtering: ['John Doe', 'Jane Smith', 'Bob Wilson']
        assert len(teams) == 1
        assert len(unpaired) == 1


class TestParsePartnerTeamsFromFormattedList:
    """Tests for partner team parsing from formatted lines."""

    def test_parses_formatted_teams(self):
        """Test parsing 'Player1 / Player2' format."""
        lines = ['John Doe / Jane Smith', 'Bob Wilson / Alice Brown']
        teams = parse_partner_teams_from_formatted_list(lines)
        assert len(teams) == 2
        assert teams[0].player1 == 'John Doe'
        assert teams[0].player2 == 'Jane Smith'

    def test_skips_non_team_lines(self):
        """Test that lines without / are skipped."""
        lines = ['John Doe / Jane Smith', 'Not a team', 'Bob Wilson / Alice Brown']
        teams = parse_partner_teams_from_formatted_list(lines)
        assert len(teams) == 2

    def test_skips_empty_lines(self):
        """Test that empty lines are skipped."""
        lines = ['John Doe / Jane Smith', '', 'Bob Wilson / Alice Brown']
        teams = parse_partner_teams_from_formatted_list(lines)
        assert len(teams) == 2

    def test_strips_whitespace(self):
        """Test that whitespace is stripped from names."""
        lines = ['  John Doe  /  Jane Smith  ']
        teams = parse_partner_teams_from_formatted_list(lines)
        assert teams[0].player1 == 'John Doe'
        assert teams[0].player2 == 'Jane Smith'


class TestReadPlayersFromFile:
    """Tests for file-based player reading."""

    def test_reads_players_from_file(self):
        """Test reading players from a file."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("John Doe\n")
            f.write("Jane Smith\n")
            f.flush()

            players = read_players_from_file(Path(f.name))
            assert len(players) == 2
            assert 'John Doe' in players

    def test_raises_on_missing_file(self):
        """Test that missing file raises InputError."""
        with pytest.raises(InputError, match="File not found"):
            read_players_from_file(Path('/nonexistent/file.txt'))

    def test_raises_on_empty_file(self):
        """Test that empty file raises InputError."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("")
            f.flush()

            with pytest.raises(InputError, match="File is empty"):
                read_players_from_file(Path(f.name))

    def test_skips_empty_lines(self):
        """Test that empty lines are skipped."""
        with NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("John Doe\n")
            f.write("\n")
            f.write("Jane Smith\n")
            f.flush()

            players = read_players_from_file(Path(f.name))
            assert len(players) == 2


class TestDetectInputFormat:
    """Tests for input format detection."""

    def test_detects_formatted_teams(self):
        """Test detection of formatted team input."""
        lines = ['John Doe / Jane Smith', 'Bob Wilson / Alice Brown']
        result = detect_input_format(lines)
        assert result == 'formatted_teams'

    def test_detects_plain_names(self):
        """Test detection of plain name input."""
        lines = ['John Doe', 'Jane Smith', 'Bob Wilson']
        result = detect_input_format(lines)
        assert result == 'plain_names'

    def test_mixed_input_detects_formatted(self):
        """Test that mixed input with any / is detected as formatted."""
        lines = ['John Doe', 'Jane Smith / Bob Wilson']
        result = detect_input_format(lines)
        assert result == 'formatted_teams'
