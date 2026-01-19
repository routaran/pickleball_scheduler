"""HTML output generator using Bootstrap 5 with modern design."""

import math
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from pathlib import Path

from .player_search import SearchResult
from .game_types import Team, calculate_team_rating
from .config import Config


@dataclass
class PlayerWithRating:
    """Player with resolved rating information."""
    name: str
    rating: float
    profile_url: Optional[str]
    found: bool
    search_method: str


@dataclass
class TeamWithRatings:
    """Team with resolved rating information."""
    player1: PlayerWithRating
    player2: PlayerWithRating
    team_rating: float


@dataclass
class Pool:
    """A pool of teams for Partner DUPR format."""
    name: str           # e.g., "A", "B", "C"
    teams: List['TeamWithRatings']
    points_per_game: int
    court_start: int    # First court number for this pool
    court_end: int      # Last court number for this pool

    @property
    def team_count(self) -> int:
        return len(self.teams)


@dataclass
class PlayerPool:
    """A pool of players for DUPR Ladder format."""
    name: str  # "A", "B", "C", "D"
    players: List[PlayerWithRating]

    @property
    def player_count(self) -> int:
        return len(self.players)


def distribute_players_to_pools(
    players: List[PlayerWithRating],
    target_size: int = 5,
    min_size: int = 4
) -> List[PlayerPool]:
    """
    Distribute players into pools of 4-5 players.
    Lower pools (lower rated) get extra players first (fill from bottom up).
    
    Algorithm:
    1. Sort players by rating (highest first)
    2. Calculate number of pools needed
    3. Distribute players - later pools get extras to avoid byes
    
    Args:
        players: List of players to distribute
        target_size: Preferred pool size (default 5)
        min_size: Minimum pool size (default 4)
    
    Returns:
        List of PlayerPool objects (A=highest rated, B, C, D=progressively lower)
    
    Examples:
        18 players → A=4, B=4, C=5, D=5
        9 players → A=4, B=5
    """
    if not players:
        return []
    
    sorted_players = sorted(players, key=lambda p: p.rating, reverse=True)
    N = len(sorted_players)
    
    # Edge case: fewer than min_size
    if N < min_size:
        return [PlayerPool(name="A", players=sorted_players)]
    
    # Calculate number of pools
    num_pools = math.ceil(N / target_size)
    while num_pools > 1 and N < num_pools * min_size:
        num_pools -= 1
    
    # Calculate sizes: later pools (lower rated) get extras
    base_size = N // num_pools
    remainder = N % num_pools
    
    pools = []
    player_index = 0
    
    for i in range(num_pools):
        pool_name = chr(65 + i)  # 'A', 'B', 'C', 'D'...
        
        # Pools at END (lower rated) get extra players
        if i >= num_pools - remainder:
            pool_size = base_size + 1
        else:
            pool_size = base_size
        
        pool_players = sorted_players[player_index:player_index + pool_size]
        player_index += pool_size
        pools.append(PlayerPool(name=pool_name, players=pool_players))
    
    return pools


def distribute_players_to_picklebros_pools(
    players: List[PlayerWithRating]
) -> List[PlayerPool]:
    """
    Distribute players into fixed pools of exactly 4 players.

    This is used for PickleBros Monday format where pools are always 4 players.
    Player count MUST be a multiple of 4 (validated before calling this function).

    Algorithm:
    1. Sort players by rating (highest first)
    2. Create N pools where N = len(players) / 4
    3. Each pool gets exactly 4 players

    Args:
        players: List of players to distribute (count must be multiple of 4)

    Returns:
        List of PlayerPool objects (A=highest rated, B, C, D=progressively lower)

    Examples:
        8 players → A=4, B=4
        12 players → A=4, B=4, C=4
        16 players → A=4, B=4, C=4, D=4
    """
    if not players:
        return []

    # Sort players by rating (highest first)
    sorted_players = sorted(players, key=lambda p: p.rating, reverse=True)
    N = len(sorted_players)

    # Calculate number of pools (player count should be validated before calling)
    num_pools = N // 4

    pools = []
    player_index = 0

    for i in range(num_pools):
        pool_name = chr(65 + i)  # 'A', 'B', 'C', 'D'...
        pool_players = sorted_players[player_index:player_index + 4]
        player_index += 4
        pools.append(PlayerPool(name=pool_name, players=pool_players))

    return pools


def distribute_teams_to_pools(
    teams: List[TeamWithRatings],
    target_size: int = Config.POOL_TARGET_SIZE,
    min_size: int = Config.POOL_MIN_SIZE,
    courts_per_pool: int = Config.COURTS_PER_POOL,
    points_by_size: dict = None
) -> List[Pool]:
    """
    Distribute teams into pools of 4-5 teams each.

    Algorithm:
    1. Sort teams by team rating (highest first)
    2. Calculate number of pools needed
    3. Distribute teams as evenly as possible
    4. Larger pools assigned to higher-rated groups first

    Args:
        teams: List of teams to distribute
        target_size: Preferred pool size (default 5)
        min_size: Minimum pool size (default 4)
        courts_per_pool: Courts assigned per pool
        points_by_size: Dict mapping pool size to points per game

    Returns:
        List of Pool objects with teams assigned
    """
    if points_by_size is None:
        points_by_size = Config.POOL_POINTS

    if not teams:
        return []

    # Sort teams by rating (highest first)
    sorted_teams = sorted(teams, key=lambda t: t.team_rating, reverse=True)
    total_teams = len(sorted_teams)

    # Calculate number of pools
    # Use ceiling division to ensure we have enough pools
    num_pools = (total_teams + target_size - 1) // target_size

    # Ensure we have at least one pool
    num_pools = max(1, num_pools)

    # If having num_pools would result in pools smaller than min_size,
    # reduce the number of pools
    while num_pools > 1 and (total_teams / num_pools) < min_size:
        num_pools -= 1

    # Calculate base size and remainder for even distribution
    base_size = total_teams // num_pools
    remainder = total_teams % num_pools

    # Build pools - larger pools get higher-rated teams
    pools = []
    team_index = 0
    court_number = 1

    for i in range(num_pools):
        # Extra team goes to earlier (higher-rated) pools
        pool_size = base_size + (1 if i < remainder else 0)
        pool_teams = sorted_teams[team_index:team_index + pool_size]
        team_index += pool_size

        # Pool name (A, B, C, etc.)
        pool_name = chr(65 + i)  # 65 = 'A'

        # Points per game based on pool size
        points = points_by_size.get(pool_size, 9)  # Default to 9

        pool = Pool(
            name=pool_name,
            teams=pool_teams,
            points_per_game=points,
            court_start=court_number,
            court_end=court_number + courts_per_pool - 1
        )
        pools.append(pool)
        court_number += courts_per_pool

    return pools


def _get_rating_tier(rating: float) -> str:
    """Determine rating tier for color coding."""
    if rating >= 4.0:
        return "high"
    elif rating >= 3.0:
        return "mid"
    else:
        return "low"


def _get_team_rating_tier(team_rating: float) -> str:
    """Determine team rating tier for color coding.

    Note: Team DUPR is calculated as 35% higher + 65% lower rating,
    so a team of two 4.0 players = 4.0, and two 3.0 players = 3.0.
    Thresholds are set accordingly for typical team ratings.
    """
    if team_rating >= 4.0:
        return "tier-highest"
    elif team_rating >= 3.5:
        return "tier-high"
    elif team_rating >= 3.0:
        return "tier-mid"
    else:
        return "tier-low"


def _html_header(title: str, game_type: str) -> str:
    """Generate HTML header with Bootstrap and custom styles."""
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        :root {{
            /* Color System */
            --color-primary: #2563eb;
            --color-primary-dark: #1d4ed8;
            --color-success: #059669;
            --color-success-light: #d1fae5;
            --color-warning: #d97706;
            --color-warning-light: #fef3c7;
            --color-muted: #6b7280;
            --color-muted-light: #9ca3af;

            /* Rating tier colors */
            --tier-high: #059669;
            --tier-high-bg: #d1fae5;
            --tier-mid: #2563eb;
            --tier-mid-bg: #dbeafe;
            --tier-low: #d97706;
            --tier-low-bg: #fef3c7;

            /* Surface colors */
            --surface-card: #ffffff;
            --surface-alt: #f9fafb;
            --border-color: #e5e7eb;

            /* Shadows */
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: var(--surface-alt);
            color: #1f2937;
        }}

        /* Typography */
        .page-title {{
            font-size: 1.75rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.25rem;
        }}

        .page-subtitle {{
            font-size: 0.9rem;
            color: var(--color-muted);
        }}

        .section-header {{
            font-size: 1.1rem;
            font-weight: 600;
            color: #374151;
        }}

        .player-name {{
            font-weight: 600;
            font-size: 1rem;
            color: #1f2937;
        }}

        .player-name a {{
            color: inherit;
            text-decoration: none;
        }}

        .player-name a:hover {{
            color: var(--color-primary);
        }}

        /* Rating Badges */
        .rating-badge {{
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
            font-weight: 600;
            font-size: 0.95rem;
            padding: 0.35rem 0.65rem;
            border-radius: 6px;
        }}

        .rating-high {{
            background-color: var(--tier-high-bg);
            color: var(--tier-high);
        }}

        .rating-mid {{
            background-color: var(--tier-mid-bg);
            color: var(--tier-mid);
        }}

        .rating-low {{
            background-color: var(--tier-low-bg);
            color: var(--tier-low);
        }}

        .badge-default {{
            background-color: #fef3c7;
            color: #92400e;
            font-size: 0.7rem;
            padding: 0.2rem 0.4rem;
            margin-left: 0.35rem;
            vertical-align: middle;
        }}

        /* Cards */
        .group-card {{
            background: var(--surface-card);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            transition: box-shadow 0.2s, transform 0.2s;
            overflow: hidden;
        }}

        .group-card:hover {{
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }}

        .group-header {{
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
            color: white;
            padding: 1rem 1.25rem;
        }}

        .group-header.alt {{
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        }}

        .group-label {{
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            opacity: 0.9;
        }}

        .team-rating {{
            font-size: 1.5rem;
            font-weight: 700;
        }}

        .player-row {{
            padding: 0.875rem 1.25rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .player-row:last-child {{
            border-bottom: none;
        }}

        .player-row.unresolved {{
            background-color: #fffbeb;
        }}

        .profile-link {{
            color: var(--color-muted-light);
            font-size: 0.9rem;
            margin-left: 0.5rem;
            transition: color 0.15s;
        }}

        .profile-link:hover {{
            color: var(--color-primary);
        }}

        /* Ladder specific */
        .tier-card {{
            background: var(--surface-card);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            overflow: hidden;
        }}

        .tier-header {{
            padding: 1rem 1.25rem;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .tier-header.tier-high {{
            background: var(--tier-high-bg);
            color: var(--tier-high);
            border-bottom: 2px solid var(--tier-high);
        }}

        .tier-header.tier-low {{
            background: var(--tier-low-bg);
            color: var(--tier-low);
            border-bottom: 2px solid var(--tier-low);
        }}

        .tier-count {{
            font-size: 0.85rem;
            font-weight: 500;
            opacity: 0.8;
        }}

        .ladder-row {{
            padding: 0.75rem 1.25rem;
            display: flex;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
        }}

        .ladder-row:nth-child(even) {{
            background-color: var(--surface-alt);
        }}

        .ladder-row:last-child {{
            border-bottom: none;
        }}

        .ladder-row.unresolved {{
            background-color: #fffbeb !important;
        }}

        .rank-badge {{
            width: 2rem;
            height: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.85rem;
            color: var(--color-muted);
            background: var(--surface-alt);
            border-radius: 50%;
            margin-right: 0.875rem;
            flex-shrink: 0;
        }}

        /* Summary */
        .summary-card {{
            background: var(--surface-card);
            border-radius: 10px;
            padding: 1rem 1.25rem;
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
        }}

        .summary-success {{
            border-left: 4px solid var(--color-success);
        }}

        .summary-warning {{
            border-left: 4px solid var(--color-warning);
        }}

        .unresolved-list {{
            background: #fffbeb;
            border-radius: 8px;
            padding: 0.875rem 1rem;
            margin-top: 1rem;
            border: 1px solid #fcd34d;
        }}

        .unresolved-list ul {{
            margin: 0;
            padding-left: 1.25rem;
        }}

        .unresolved-list li {{
            color: #92400e;
            font-size: 0.9rem;
        }}

        /* Pool Cards - Partner DUPR */
        .pool-card {{
            background: var(--surface-card);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            margin-bottom: 1.5rem;
            overflow: hidden;
        }}

        .pool-header {{
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid;
        }}

        .pool-header.pool-a {{
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            border-bottom-color: #059669;
        }}

        .pool-header.pool-b {{
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            border-bottom-color: #2563eb;
        }}

        .pool-header.pool-c {{
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            color: white;
            border-bottom-color: #7c3aed;
        }}

        .pool-header.pool-d {{
            background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
            color: white;
            border-bottom-color: #db2777;
        }}

        .pool-header.pool-default {{
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            color: white;
            border-bottom-color: #6b7280;
        }}

        .pool-name {{
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: 0.025em;
        }}

        .pool-meta {{
            font-size: 0.85rem;
            opacity: 0.9;
        }}

        .pool-meta-item {{
            display: inline-block;
            margin-left: 1rem;
        }}

        .pool-meta-item:first-child {{
            margin-left: 0;
        }}

        /* Team Table within Pool */
        .team-table {{
            width: 100%;
            border-collapse: collapse;
        }}

        .team-table thead {{
            background: var(--surface-alt);
        }}

        .team-table th {{
            padding: 0.75rem 1rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-muted);
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }}

        .team-table th.text-center {{
            text-align: center;
        }}

        .team-table th.text-end {{
            text-align: right;
        }}

        .team-row {{
            border-bottom: 1px solid var(--border-color);
        }}

        .team-row:nth-child(even) {{
            background-color: var(--surface-alt);
        }}

        .team-row:last-child {{
            border-bottom: none;
        }}

        .team-row td {{
            padding: 0.875rem 1rem;
            vertical-align: middle;
        }}

        .team-rank {{
            width: 2.5rem;
            height: 2.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1rem;
            color: var(--color-muted);
            background: var(--surface-alt);
            border-radius: 50%;
        }}

        .team-row:nth-child(even) .team-rank {{
            background: var(--surface-card);
        }}

        .team-players {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem 1.5rem;
        }}

        .player-cell {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .individual-ratings {{
            display: flex;
            gap: 0.5rem;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
            font-size: 0.85rem;
            color: var(--color-muted);
        }}

        .team-dupr {{
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
            font-size: 1.1rem;
            font-weight: 700;
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
        }}

        .team-dupr.tier-highest {{
            background: #dcfce7;
            color: #166534;
        }}

        .team-dupr.tier-high {{
            background: #dbeafe;
            color: #1e40af;
        }}

        .team-dupr.tier-mid {{
            background: #fef3c7;
            color: #92400e;
        }}

        .team-dupr.tier-low {{
            background: #fee2e2;
            color: #991b1b;
        }}

        /* Page header stats */
        .header-stats {{
            display: flex;
            gap: 1.5rem;
            margin-top: 0.5rem;
            font-size: 0.9rem;
            color: var(--color-muted);
        }}

        .header-stat {{
            display: flex;
            align-items: center;
            gap: 0.35rem;
        }}

        /* Responsive */
        @media (max-width: 991px) {{
            .team-players {{
                flex-direction: column;
                gap: 0.5rem;
            }}

            .pool-header {{
                flex-direction: column;
                gap: 0.75rem;
                align-items: flex-start;
            }}

            .pool-meta {{
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem 1rem;
            }}

            .pool-meta-item {{
                margin-left: 0;
            }}
        }}

        @media (max-width: 768px) {{
            .team-table thead {{
                display: none;
            }}

            .team-row {{
                display: block;
                padding: 1rem;
            }}

            .team-row td {{
                display: block;
                padding: 0.25rem 0;
            }}

            .team-row td:first-child {{
                float: left;
                margin-right: 1rem;
            }}

            .team-row td:last-child {{
                margin-top: 0.75rem;
                clear: both;
            }}

            .individual-ratings {{
                margin-top: 0.5rem;
            }}

            .header-stats {{
                flex-direction: column;
                gap: 0.5rem;
            }}
        }}

        /* Print styles */
        @media print {{
            body {{
                background: white !important;
                color: black !important;
                font-size: 10pt;
            }}

            .container {{
                max-width: 100% !important;
                padding: 0 !important;
            }}

            .pool-card {{
                box-shadow: none !important;
                border: 2px solid #000 !important;
                page-break-inside: avoid;
                margin-bottom: 1rem;
            }}

            .pool-header {{
                background: none !important;
                color: black !important;
                border-bottom: 2px solid black !important;
            }}

            .pool-header.pool-a,
            .pool-header.pool-b,
            .pool-header.pool-c,
            .pool-header.pool-d,
            .pool-header.pool-default {{
                background: #f0f0f0 !important;
            }}

            .team-dupr {{
                background: none !important;
                border: 1px solid #000;
            }}

            .profile-link {{
                display: none !important;
            }}

            .summary-card {{
                border: 1px solid #000 !important;
            }}

            a {{
                color: black !important;
                text-decoration: none !important;
            }}
        }}

        /* Responsive */
        @media (max-width: 768px) {{
            .page-title {{
                font-size: 1.5rem;
            }}

            .team-rating {{
                font-size: 1.25rem;
            }}

            .player-row {{
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
            }}

            .ladder-row {{
                flex-wrap: wrap;
            }}
        }}
    </style>
</head>
<body>
    <div class="container py-4">
'''


def _html_footer() -> str:
    """Generate HTML footer."""
    return '''
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
'''


def _player_link(player: PlayerWithRating) -> str:
    """Generate player name with optional profile link icon."""
    name_html = f'<span class="player-name">{player.name}</span>'
    if player.profile_url:
        link_icon = f'<a href="{player.profile_url}" target="_blank" class="profile-link" title="View DUPR Profile"><i class="bi bi-box-arrow-up-right"></i></a>'
        return name_html + link_icon
    return name_html


def _rating_badge(rating: float, found: bool) -> str:
    """Generate rating badge with tier coloring."""
    tier = _get_rating_tier(rating)
    tier_class = f"rating-{tier}"
    badge = f'<span class="rating-badge {tier_class}">{rating:.2f}</span>'
    if not found:
        badge += '<span class="badge badge-default">Default</span>'
    return badge


def _resolution_summary(total: int, resolved: int, unresolved_players: List[str]) -> str:
    """Generate resolution summary HTML."""
    status_class = "summary-success" if resolved == total else "summary-warning"
    status_icon = "bi-check-circle-fill text-success" if resolved == total else "bi-exclamation-triangle-fill text-warning"

    html = f'''
        <div class="summary-card {status_class}">
            <div class="d-flex align-items-center">
                <i class="bi {status_icon} me-2"></i>
                <span><strong>Players resolved:</strong> {resolved}/{total}</span>
            </div>
    '''

    if unresolved_players:
        html += '''
            <div class="unresolved-list">
                <strong style="color: #92400e; font-size: 0.85rem;">Using default rating (2.5):</strong>
                <ul class="mt-1">
        '''
        for name in unresolved_players:
            html += f'<li>{name}</li>'
        html += '</ul></div>'

    html += '</div>'
    return html


def generate_dupr_ladder_html(
    players: List[PlayerWithRating],
    output_path: Optional[Path] = None
) -> str:
    """
    Generate HTML for DUPR Ladder format with dynamic pool layout.
    Players distributed into pools of 4-5, named A (highest) through D (lowest).
    Lower pools get extra players first to avoid byes.
    """
    # Distribute players into pools
    pools = distribute_players_to_pools(players)

    resolved = sum(1 for p in players if p.found)
    unresolved = [p.name for p in players if not p.found]

    html = _html_header("DUPR Ladder Rankings", "ladder")

    # Page header
    date_str = datetime.now().strftime("%B %d, %Y")
    html += f'''
        <div class="mb-4">
            <h1 class="page-title">DUPR Ladder</h1>
            <p class="page-subtitle">{date_str}</p>
        </div>
    '''

    html += _resolution_summary(len(players), resolved, unresolved)

    # Determine column class based on number of pools
    num_pools = len(pools)
    if num_pools == 1:
        col_class = "col-12"
    elif num_pools == 2:
        col_class = "col-12 col-md-6"
    elif num_pools == 3:
        col_class = "col-12 col-md-6 col-lg-4"
    else:  # 4+ pools - 2x2 grid
        col_class = "col-12 col-md-6"

    html += '<div class="row">'

    for pool in pools:
        # Determine pool header style
        pool_lower = pool.name.lower()
        if pool_lower in ['a', 'b', 'c', 'd']:
            pool_style_class = f"pool-{pool_lower}"
        else:
            pool_style_class = "pool-default"

        html += f'''
        <div class="{col_class} mb-4">
            <div class="pool-card">
                <div class="pool-header {pool_style_class}">
                    <span class="pool-name">POOL {pool.name}</span>
                    <span class="pool-meta">({pool.player_count} players)</span>
                </div>
        '''
        for rank, player in enumerate(pool.players, 1):
            unresolved_class = " unresolved" if not player.found else ""
            html += f'''
                <div class="ladder-row{unresolved_class}">
                    <span class="rank-badge">{rank}</span>
                    <div class="flex-grow-1">
                        {_player_link(player)}
                    </div>
                    {_rating_badge(player.rating, player.found)}
                </div>
            '''
        html += '''
            </div>
        </div>
        '''

    html += '</div>'

    html += _html_footer()

    if output_path:
        output_path.write_text(html)

    return html


def generate_picklebros_monday_html(
    players: List[PlayerWithRating],
    output_path: Optional[Path] = None
) -> str:
    """
    Generate HTML for PickleBros Monday format with fixed 4-player pools.
    Players distributed into pools of exactly 4, named A (highest) through N (lowest).
    """
    # Distribute players into fixed 4-player pools
    pools = distribute_players_to_picklebros_pools(players)

    resolved = sum(1 for p in players if p.found)
    unresolved = [p.name for p in players if not p.found]

    html = _html_header("PickleBros Monday", "picklebros")

    # Page header
    date_str = datetime.now().strftime("%B %d, %Y")
    html += f'''
        <div class="mb-4">
            <h1 class="page-title">PickleBros Monday</h1>
            <p class="page-subtitle">{date_str} | Fixed 4-Player Pools</p>
        </div>
    '''

    html += _resolution_summary(len(players), resolved, unresolved)

    # Determine column class based on number of pools
    num_pools = len(pools)
    if num_pools == 1:
        col_class = "col-12"
    elif num_pools == 2:
        col_class = "col-12 col-md-6"
    elif num_pools == 3:
        col_class = "col-12 col-md-6 col-lg-4"
    else:  # 4+ pools - 2x2 grid
        col_class = "col-12 col-md-6"

    html += '<div class="row">'

    for pool in pools:
        # Determine pool header style
        pool_lower = pool.name.lower()
        if pool_lower in ['a', 'b', 'c', 'd']:
            pool_style_class = f"pool-{pool_lower}"
        else:
            pool_style_class = "pool-default"

        html += f'''
        <div class="{col_class} mb-4">
            <div class="pool-card">
                <div class="pool-header {pool_style_class}">
                    <span class="pool-name">POOL {pool.name}</span>
                    <span class="pool-meta">(4 players)</span>
                </div>
        '''
        for rank, player in enumerate(pool.players, 1):
            unresolved_class = " unresolved" if not player.found else ""
            html += f'''
                <div class="ladder-row{unresolved_class}">
                    <span class="rank-badge">{rank}</span>
                    <div class="flex-grow-1">
                        {_player_link(player)}
                    </div>
                    {_rating_badge(player.rating, player.found)}
                </div>
            '''
        html += '''
            </div>
        </div>
        '''

    html += '</div>'

    html += _html_footer()

    if output_path:
        output_path.write_text(html)

    return html


def generate_partner_dupr_html(
    teams: List[TeamWithRatings],
    output_path: Optional[Path] = None
) -> str:
    """
    Generate HTML for Partner DUPR format with pool-based layout.

    Teams are grouped into pools of 4-5 teams each, sorted by Team DUPR rating.
    Pool A contains the highest-rated teams, Pool B the next tier, etc.
    """
    # Distribute teams into pools
    pools = distribute_teams_to_pools(teams)

    # Calculate totals for header
    total_teams = len(teams)
    total_pools = len(pools)

    all_players = []
    for team in teams:
        all_players.extend([team.player1, team.player2])

    resolved = sum(1 for p in all_players if p.found)
    unresolved = [p.name for p in all_players if not p.found]

    html = _html_header("Partner DUPR", "partner")

    # Page header with stats
    date_str = datetime.now().strftime("%B %d, %Y")
    html += f'''
        <div class="mb-4">
            <h1 class="page-title">Partner DUPR</h1>
            <p class="page-subtitle">{date_str}</p>
            <div class="header-stats">
                <span class="header-stat"><i class="bi bi-people-fill me-1"></i> {total_teams} Teams</span>
                <span class="header-stat"><i class="bi bi-grid-3x3-gap-fill me-1"></i> {total_pools} Pools</span>
                <span class="header-stat"><i class="bi bi-check-circle me-1"></i> {resolved}/{len(all_players)} players resolved</span>
            </div>
        </div>
    '''

    html += _resolution_summary(len(all_players), resolved, unresolved)

    # Generate pool cards
    for pool in pools:
        # Determine pool header class
        pool_class = f"pool-{pool.name.lower()}" if pool.name.lower() in ['a', 'b', 'c', 'd'] else "pool-default"

        html += f'''
        <div class="pool-card">
            <div class="pool-header {pool_class}">
                <span class="pool-name">POOL {pool.name}</span>
                <div class="pool-meta">
                    <span class="pool-meta-item"><i class="bi bi-people"></i> {pool.team_count} Teams</span>
                </div>
            </div>
            <table class="team-table">
                <thead>
                    <tr>
                        <th style="width: 60px;">#</th>
                        <th>Team</th>
                        <th class="text-center" style="width: 120px;">Ind. DUPR</th>
                        <th class="text-end" style="width: 100px;">Team</th>
                    </tr>
                </thead>
                <tbody>
        '''

        for rank, team in enumerate(pool.teams, 1):
            p1 = team.player1
            p2 = team.player2
            team_tier = _get_team_rating_tier(team.team_rating)

            html += f'''
                    <tr class="team-row">
                        <td>
                            <div class="team-rank">{rank}</div>
                        </td>
                        <td>
                            <div class="team-players">
                                <div class="player-cell">
                                    {_player_link(p1)}
                                </div>
                                <div class="player-cell">
                                    {_player_link(p2)}
                                </div>
                            </div>
                        </td>
                        <td class="text-center">
                            <div class="individual-ratings">
                                <span>{p1.rating:.2f}</span>
                                <span>{p2.rating:.2f}</span>
                            </div>
                        </td>
                        <td class="text-end">
                            <span class="team-dupr {team_tier}">{team.team_rating:.2f}</span>
                        </td>
                    </tr>
            '''

        html += '''
                </tbody>
            </table>
        </div>
        '''

    html += _html_footer()

    if output_path:
        output_path.write_text(html)

    return html
