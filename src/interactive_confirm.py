"""Interactive confirmation for ambiguous player matches."""

import sys
from typing import List, Optional

from .dupr_client import DUPRPlayer
from .nickname_resolver import get_fuzzy_score


def is_interactive() -> bool:
    """Check if we're running in an interactive terminal."""
    try:
        return sys.stdin.isatty() and sys.stdout.isatty()
    except AttributeError:
        return False


def format_player_option(player: DUPRPlayer, index: int, search_name: str) -> str:
    """Format a player as a numbered option for display.
    
    Args:
        player: The DUPR player to format.
        index: The option number (1-based).
        search_name: The name being searched for (to show similarity).
        
    Returns:
        Formatted string for display.
    """
    rating_str = f"{player.best_rating:.2f}" if player.best_rating else "NR"
    location = player.short_address or "Unknown location"
    
    # Calculate similarity score for display
    similarity = get_fuzzy_score(search_name, player.full_name) * 100
    
    return f"  {index}. {player.full_name} ({rating_str}) - {location} [{similarity:.0f}% match]"


def prompt_player_selection(
    search_name: str,
    candidates: List[DUPRPlayer],
    max_display: int = 5
) -> Optional[DUPRPlayer]:
    """Prompt the user to select the correct player from candidates.
    
    Args:
        search_name: The name that was searched for.
        candidates: List of candidate players to choose from.
        max_display: Maximum number of candidates to display.
        
    Returns:
        The selected DUPRPlayer, or None if skipped or non-interactive.
    """
    if not candidates:
        return None
    
    if not is_interactive():
        # Non-interactive mode: return the best match by fuzzy score
        best = max(candidates, key=lambda p: get_fuzzy_score(search_name, p.full_name))
        return best
    
    # Display candidates
    print(f"\nFound {len(candidates)} possible matches for \"{search_name}\":")
    
    display_candidates = candidates[:max_display]
    for i, player in enumerate(display_candidates, 1):
        print(format_player_option(player, i, search_name))
    
    if len(candidates) > max_display:
        print(f"  ... and {len(candidates) - max_display} more")
    
    print(f"  {len(display_candidates) + 1}. Skip (use default rating)")
    print()
    
    # Prompt for selection
    while True:
        try:
            choice = input(f"Select [1-{len(display_candidates) + 1}]: ").strip()
            
            if not choice:
                # Empty input = skip
                return None
            
            choice_num = int(choice)
            
            if choice_num == len(display_candidates) + 1:
                # Skip option
                return None
            
            if 1 <= choice_num <= len(display_candidates):
                selected = display_candidates[choice_num - 1]
                print(f"Selected: {selected.full_name}")
                return selected
            
            print(f"Please enter a number between 1 and {len(display_candidates) + 1}")
            
        except ValueError:
            print("Invalid input. Please enter a number.")
        except (EOFError, KeyboardInterrupt):
            print("\nSelection cancelled.")
            return None


def confirm_single_match(
    search_name: str,
    candidate: DUPRPlayer
) -> bool:
    """Confirm a single ambiguous match with the user.
    
    Args:
        search_name: The name that was searched for.
        candidate: The candidate player to confirm.
        
    Returns:
        True if confirmed, False if rejected.
    """
    if not is_interactive():
        # Non-interactive mode: accept the match
        return True
    
    rating_str = f"{candidate.best_rating:.2f}" if candidate.best_rating else "NR"
    location = candidate.short_address or "Unknown location"
    similarity = get_fuzzy_score(search_name, candidate.full_name) * 100
    
    print(f"\nFound potential match for \"{search_name}\":")
    print(f"  {candidate.full_name} ({rating_str}) - {location} [{similarity:.0f}% match]")
    
    while True:
        try:
            response = input("Is this correct? [Y/n]: ").strip().lower()
            
            if response in ('', 'y', 'yes'):
                return True
            if response in ('n', 'no'):
                return False
            
            print("Please enter 'y' or 'n'")
            
        except (EOFError, KeyboardInterrupt):
            print("\nConfirmation cancelled.")
            return False
