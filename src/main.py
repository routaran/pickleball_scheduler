"""Main application entry point for DUPR lookup."""

import argparse
import sys
import webbrowser
from pathlib import Path
from typing import List

from .config import load_config, Config, debug_log, ensure_user_info, UserInfo, UserInfoError
from .dupr_client import DUPRClient, TokenExpiredError
from .auth import DUPRAuthenticator
from .player_search import PlayerSearcher, SearchResult
from .game_types import (
    GameType,
    parse_dupr_ladder_players,
    parse_partner_dupr_teams,
    calculate_team_rating,
    Team
)
from .html_generator import (
    PlayerWithRating,
    TeamWithRatings,
    generate_dupr_ladder_html,
    generate_partner_dupr_html
)
from .input_parser import (
    InputError,
    prompt_game_type,
    read_player_list_interactive,
    parse_ladder_players_from_list,
    parse_partner_teams_from_list,
    parse_partner_teams_from_formatted_list,
    read_players_from_file,
    detect_input_format
)


def handle_token_expired(config: Config) -> None:
    """Handle token expiration by prompting for re-authentication."""
    print("Token expired. Opening login window to refresh...")
    auth = DUPRAuthenticator(config.base_path / "config")
    auth.clear_token()
    new_token = auth.get_token_interactive()
    if new_token:
        print("Token refreshed! Please run the command again.")
    else:
        print("Re-authentication cancelled or failed.")


def search_result_to_player(result: SearchResult) -> PlayerWithRating:
    """Convert SearchResult to PlayerWithRating."""
    return PlayerWithRating(
        name=result.name,
        rating=result.rating,
        profile_url=result.profile_url,
        found=result.found,
        search_method=result.search_method
    )


def process_dupr_ladder(
    config: Config,
    searcher: PlayerSearcher,
    players: List[str],
    output_file: Path
) -> bool:
    """Process DUPR Ladder game type."""
    print(f"Processing DUPR Ladder with {len(players)} players")

    results: List[PlayerWithRating] = []
    for i, name in enumerate(players, 1):
        print(f"  [{i}/{len(players)}] Looking up: {name}")
        try:
            result = searcher.search_player(name)
            results.append(search_result_to_player(result))
            status = "✓" if result.found else "? (default rating)"
            print(f"    {status} Rating: {result.rating:.3f}")
        except TokenExpiredError:
            handle_token_expired(config)
            return False

    html = generate_dupr_ladder_html(results, output_file)
    print(f"\nOutput written to: {output_file}")
    webbrowser.open(output_file.as_uri())

    resolved = sum(1 for r in results if r.found)
    print(f"Resolution summary: {resolved}/{len(results)} players found")

    return True


def process_partner_dupr(
    config: Config,
    searcher: PlayerSearcher,
    teams: List[Team],
    output_file: Path
) -> bool:
    """Process Partner DUPR game type."""
    print(f"Processing Partner DUPR with {len(teams)} teams")

    team_results: List[TeamWithRatings] = []

    # Collect all unique player names
    all_names = set()
    for team in teams:
        all_names.add(team.player1)
        all_names.add(team.player2)

    # Look up all players once
    player_cache = {}
    total_players = len(all_names)
    for i, name in enumerate(sorted(all_names), 1):
        print(f"  [{i}/{total_players}] Looking up: {name}")
        try:
            result = searcher.search_player(name)
            player_cache[name] = search_result_to_player(result)
            status = "✓" if result.found else "? (default rating)"
            print(f"    {status} Rating: {result.rating:.3f}")
        except TokenExpiredError:
            handle_token_expired(config)
            return False

    # Build team results
    for team in teams:
        p1 = player_cache[team.player1]
        p2 = player_cache[team.player2]
        team_rating = calculate_team_rating(p1.rating, p2.rating)

        team_results.append(TeamWithRatings(
            player1=p1,
            player2=p2,
            team_rating=team_rating
        ))

    html = generate_partner_dupr_html(team_results, output_file)
    print(f"\nOutput written to: {output_file}")
    webbrowser.open(output_file.as_uri())

    resolved = sum(1 for name, p in player_cache.items() if p.found)
    print(f"Resolution summary: {resolved}/{total_players} players found")

    return True


def run_interactive_mode(config: Config, searcher: PlayerSearcher, base_path: Path) -> bool:
    """Run in interactive mode, prompting for input with re-prompt on validation errors."""
    try:
        # Prompt for game type
        game_type = prompt_game_type()

        # Determine output file
        output_file = base_path / "output" / (
            "dupr_ladder.html" if game_type == GameType.DUPR_LADDER else "partner_dupr.html"
        )
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Loop until we get valid input
        while True:
            # Read player list (already has re-prompt for empty/minimum players)
            names = read_player_list_interactive()

            if game_type == GameType.DUPR_LADDER:
                players = parse_ladder_players_from_list(names)
                print(f"\nProcessing {len(players)} players...")
                return process_dupr_ladder(config, searcher, players, output_file)
            else:
                # Check if input is formatted (Player1 / Player2) or plain names
                input_format = detect_input_format(names)
                if input_format == "formatted_teams":
                    teams = parse_partner_teams_from_formatted_list(names)
                else:
                    teams, unpaired = parse_partner_teams_from_list(names)
                    if unpaired:
                        print(f"Warning: Unpaired player will be excluded: {unpaired[0]}")

                # Validate Partner DUPR specific requirements
                if not teams:
                    print("Error: No valid teams found in input. Please try again.")
                    continue

                if len(teams) < 2:
                    print("Error: Minimum 2 teams required for Partner DUPR. Please try again.")
                    continue

                print(f"\nProcessing {len(teams)} teams ({len(teams) * 2} players)...")
                return process_partner_dupr(config, searcher, teams, output_file)

    except InputError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return False


def run_file_mode(
    config: Config,
    searcher: PlayerSearcher,
    base_path: Path,
    file_path: Path,
    game_type_str: str,
    output_path: Path = None
) -> bool:
    """Run with file-based input (backward compatibility mode)."""
    try:
        # Determine game type
        if game_type_str == "ladder":
            game_type = GameType.DUPR_LADDER
            default_output = base_path / "output" / "dupr_ladder.html"
        else:
            game_type = GameType.PARTNER_DUPR
            default_output = base_path / "output" / "partner_dupr.html"

        output_file = output_path if output_path else default_output
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Read from file
        lines = read_players_from_file(file_path)

        if game_type == GameType.DUPR_LADDER:
            players = parse_ladder_players_from_list(lines)
            return process_dupr_ladder(config, searcher, players, output_file)
        else:
            # Partner DUPR expects "Player1 / Player2" format in files
            teams = parse_partner_dupr_teams(file_path)
            return process_partner_dupr(config, searcher, teams, output_file)

    except InputError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return False


def get_player_list_from_stdin(game_type: str) -> List[str]:
    """
    Prompt user to paste player list via stdin.

    Args:
        game_type: Either "partner" or "ladder"

    Returns:
        List of input lines

    Raises:
        InputError: If input is cancelled or empty
    """
    if game_type == "partner":
        print("Paste partner list (format: Player1 / Player2 per line)")
    else:
        print("Paste a player list for the DUPR Ladder")

    print("Press Enter twice when done:\n")

    lines = []
    empty_count = 0

    try:
        while True:
            line = input()

            if line.strip() == "":
                empty_count += 1
                if empty_count >= 1 and lines:  # Have content, blank line = done
                    break
            else:
                empty_count = 0
                lines.append(line.strip())
    except EOFError:
        # End of input (Ctrl+D on Unix, Ctrl+Z on Windows)
        if not lines:
            raise InputError("Input cancelled. Exiting.")

    if not lines:
        raise InputError("No input provided.")

    debug_log(f"Read {len(lines)} lines from stdin")
    return lines


def run_stdin_mode(
    config: Config,
    searcher: PlayerSearcher,
    base_path: Path,
    game_type_str: str,
    output_path: Path = None
) -> bool:
    """Run with stdin-based input (game type specified via positional argument)."""
    try:
        # Determine game type and output file
        if game_type_str == "ladder":
            game_type = GameType.DUPR_LADDER
            default_output = base_path / "output" / "dupr_ladder.html"
        else:
            game_type = GameType.PARTNER_DUPR
            default_output = base_path / "output" / "partner_dupr.html"

        output_file = output_path if output_path else default_output
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Read from stdin
        lines = get_player_list_from_stdin(game_type_str)

        if game_type == GameType.DUPR_LADDER:
            players = parse_ladder_players_from_list(lines)
            if not players:
                print("ERROR: No players provided.", file=sys.stderr)
                return False
            print(f"\nProcessing {len(players)} players...")
            return process_dupr_ladder(config, searcher, players, output_file)
        else:
            # Partner DUPR expects "Player1 / Player2" format
            teams = parse_partner_teams_from_formatted_list(lines)
            if not teams:
                print("ERROR: No valid teams found. Use format: Player1 / Player2", file=sys.stderr)
                return False
            print(f"\nProcessing {len(teams)} teams...")
            return process_partner_dupr(config, searcher, teams, output_file)

    except InputError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return False


def add_user_info_to_overrides(config: Config, user_info: UserInfo) -> None:
    """Add user info to the config overrides so the search algorithm uses it."""
    from .config import PlayerOverride

    name_key = user_info.name.lower().strip()
    if name_key not in config.overrides:
        config.overrides[name_key] = PlayerOverride(
            name=user_info.name,
            rating=user_info.rating,
            reason=user_info.reason
        )
        debug_log(f"Added user info to overrides: {user_info.name} ({user_info.rating})")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Look up DUPR ratings for pickleball players",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Interactive mode (paste from clipboard):
    python -m src.main

  File mode (backward compatible):
    python -m src.main --file DUPRladder.playerList --type ladder
    python -m src.main --file partnerDUPR.playerList --type partner

  Legacy mode (positional argument):
    python -m src.main ladder
    python -m src.main partner
"""
    )
    parser.add_argument(
        "game_type",
        nargs="?",
        choices=["ladder", "partner"],
        help="Game type: 'ladder' for DUPR Ladder, 'partner' for Partner DUPR"
    )
    parser.add_argument(
        "-f", "--file",
        help="Read player list from file instead of interactive input"
    )
    parser.add_argument(
        "-t", "--type",
        choices=["ladder", "partner"],
        help="Game type when using --file (required with --file)"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output HTML file path (default: output/<game_type>.html)"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug output"
    )

    args = parser.parse_args()

    # Set debug mode via environment
    if args.debug:
        import os
        os.environ['DEBUG'] = 'true'

    # Reload config after setting debug
    base_path = Path(__file__).parent.parent
    config = load_config(base_path)

    # Load or set up user info (first-run setup if needed)
    try:
        user_info = ensure_user_info(base_path)
        # Add user info to overrides so search algorithm uses it
        add_user_info_to_overrides(config, user_info)
    except UserInfoError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    # Set up client and searcher
    client = DUPRClient(config)
    searcher = PlayerSearcher(config, client)

    # Determine mode of operation
    if args.file:
        # File mode (new --file argument)
        if not args.type:
            print("ERROR: --type is required when using --file", file=sys.stderr)
            sys.exit(1)

        file_path = Path(args.file)
        output_path = Path(args.output) if args.output else None
        success = run_file_mode(config, searcher, base_path, file_path, args.type, output_path)

    elif args.game_type:
        # Stdin mode (positional argument specifies game type, input from stdin)
        output_path = Path(args.output) if args.output else None
        success = run_stdin_mode(config, searcher, base_path, args.game_type, output_path)

    else:
        # Interactive mode (no arguments)
        success = run_interactive_mode(config, searcher, base_path)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
