"""Game type definitions and player list parsers."""

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import List, Tuple

from .config import debug_log


class GameType(Enum):
    """Supported game types."""
    DUPR_LADDER = "dupr_ladder"
    PARTNER_DUPR = "partner_dupr"
    PICKLEBROS_MONDAY = "picklebros_monday"


@dataclass
class Team:
    """A team of two players for Partner DUPR."""
    player1: str
    player2: str

    @property
    def players(self) -> Tuple[str, str]:
        return (self.player1, self.player2)


def parse_dupr_ladder_players(file_path: Path) -> List[str]:
    """
    Parse player list for DUPR Ladder format.
    One player name per line.
    """
    players = []
    with open(file_path) as f:
        for line in f:
            name = line.strip()
            if name:
                players.append(name)

    debug_log(f"Parsed {len(players)} players from {file_path}")
    return players


def parse_partner_dupr_teams(file_path: Path) -> List[Team]:
    """
    Parse player list for Partner DUPR format.
    Format: "Player1 / Player2" per line.
    """
    teams = []
    with open(file_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            if "/" not in line:
                debug_log(f"Skipping invalid team line: {line}")
                continue

            parts = line.split("/")
            if len(parts) != 2:
                debug_log(f"Skipping malformed team line: {line}")
                continue

            player1 = parts[0].strip()
            player2 = parts[1].strip()

            if player1 and player2:
                teams.append(Team(player1=player1, player2=player2))

    debug_log(f"Parsed {len(teams)} teams from {file_path}")
    return teams


def calculate_team_rating(rating1: float, rating2: float) -> float:
    """
    Calculate combined team rating using Partner DUPR formula:
    35% of higher rating + 65% of lower rating
    """
    higher = max(rating1, rating2)
    lower = min(rating1, rating2)
    return round(0.35 * higher + 0.65 * lower, 3)
