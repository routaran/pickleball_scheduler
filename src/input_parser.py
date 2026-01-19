"""Input parsing module for interactive and file-based player input."""

import sys
from pathlib import Path
from typing import List, Optional, Tuple

from .config import debug_log
from .game_types import GameType, Team


class InputError(Exception):
    """Error during input parsing."""
    pass


def prompt_game_type() -> GameType:
    """
    Interactively prompt user for game type selection.

    Returns:
        GameType: Selected game type
    """
    while True:
        print("\nSelect game type:")
        print("  1. Partner DUPR (fixed teams)")
        print("  2. DUPR Ladder (individual ranking)")

        try:
            choice = input("Enter choice [1/2]: ").strip()
        except EOFError:
            raise InputError("No game type selection provided. Exiting.")

        if choice == "1":
            return GameType.PARTNER_DUPR
        elif choice == "2":
            return GameType.DUPR_LADDER
        else:
            print("Invalid choice. Please enter 1 or 2.")


def _read_player_list_once() -> List[str]:
    """
    Read player list from stdin once.

    Returns:
        List[str]: List of player names (may be empty)

    Raises:
        EOFError: If input is terminated (Ctrl+D/Ctrl+Z)
    """
    print("\nPaste player list below (same format as before).")
    print("Press Enter twice when done:\n")

    lines = []
    empty_count = 0

    while True:
        line = input()

        if line.strip() == "":
            empty_count += 1
            if empty_count >= 1:  # Single empty line ends input
                break
        else:
            empty_count = 0
            lines.append(line.strip())

    # Filter out any remaining empty lines
    return [line for line in lines if line]


def read_player_list_interactive() -> List[str]:
    """
    Read player list from stdin interactively with re-prompt on validation error.

    User pastes names (one per line), double-Enter signals end of input.
    On validation error, displays error message and re-prompts.

    Returns:
        List[str]: List of player names

    Raises:
        InputError: If user cancels input (Ctrl+D/Ctrl+C)
    """
    while True:
        try:
            players = _read_player_list_once()

            if not players:
                print("Error: No players provided. Please try again.")
                continue

            if len(players) < 2:
                print("Error: Minimum 2 players required. Please try again.")
                continue

            debug_log(f"Read {len(players)} players from interactive input")
            return players

        except EOFError:
            # End of input (Ctrl+D on Unix, Ctrl+Z on Windows)
            raise InputError("Input cancelled. Exiting.")


def parse_ladder_players_from_list(names: List[str]) -> List[str]:
    """
    Parse a list of names for DUPR Ladder format.

    Args:
        names: List of player name strings

    Returns:
        List[str]: Validated player names
    """
    players = [name.strip() for name in names if name.strip()]
    debug_log(f"Parsed {len(players)} players for ladder")
    return players


def parse_partner_teams_from_list(names: List[str]) -> Tuple[List[Team], List[str]]:
    """
    Parse a list of names for Partner DUPR format.

    For Partner DUPR, names are paired sequentially (1st with 2nd, 3rd with 4th, etc.)

    Args:
        names: List of player name strings

    Returns:
        Tuple[List[Team], List[str]]: Teams and any unpaired players
    """
    players = [name.strip() for name in names if name.strip()]
    teams = []

    for i in range(0, len(players) - 1, 2):
        teams.append(Team(player1=players[i], player2=players[i + 1]))

    # Track unpaired player if odd number
    unpaired = [players[-1]] if len(players) % 2 == 1 else []

    debug_log(f"Parsed {len(teams)} teams from list, {len(unpaired)} unpaired")
    return teams, unpaired


def parse_partner_teams_from_formatted_list(lines: List[str]) -> List[Team]:
    """
    Parse teams from formatted "Player1 / Player2" lines.

    Args:
        lines: List of formatted team strings

    Returns:
        List[Team]: Parsed teams
    """
    teams = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if "/" in line:
            # Formatted team line
            parts = line.split("/")
            if len(parts) == 2:
                player1 = parts[0].strip()
                player2 = parts[1].strip()
                if player1 and player2:
                    teams.append(Team(player1=player1, player2=player2))
        else:
            debug_log(f"Skipping non-team line: {line}")

    debug_log(f"Parsed {len(teams)} teams from formatted list")
    return teams


def read_players_from_file(file_path: Path) -> List[str]:
    """
    Read player names from a file.

    Args:
        file_path: Path to the player list file

    Returns:
        List[str]: List of player names/lines

    Raises:
        InputError: If file doesn't exist or is empty
    """
    if not file_path.exists():
        raise InputError(f"File not found: {file_path}")

    with open(file_path) as f:
        lines = [line.strip() for line in f if line.strip()]

    if not lines:
        raise InputError(f"File is empty: {file_path}")

    debug_log(f"Read {len(lines)} lines from {file_path}")
    return lines


def detect_input_format(lines: List[str]) -> str:
    """
    Detect whether input is formatted teams or plain names.

    Args:
        lines: Input lines

    Returns:
        str: 'formatted_teams' if lines contain '/', else 'plain_names'
    """
    for line in lines:
        if "/" in line:
            return "formatted_teams"
    return "plain_names"
