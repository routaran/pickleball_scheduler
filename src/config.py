"""Configuration management for DUPR lookup application."""

import json
import os
import sys
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Optional

DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'

def debug_log(message: str) -> None:
    """Log debug messages to stderr."""
    if DEBUG:
        print(f"[DEBUG] {message}", file=sys.stderr)


@dataclass
class PlayerOverride:
    """Represents a hardcoded player rating override."""
    name: str
    rating: float
    reason: str


@dataclass
class UserInfo:
    """User's own player info for DUPR lookup."""
    name: str
    rating: float
    reason: str = "Player exists on DUPR but not findable via search API"


class UserInfoError(Exception):
    """Error during user info handling."""
    pass


@dataclass
class Config:
    """Application configuration."""
    base_path: Path
    token: str
    overrides: Dict[str, PlayerOverride]

    # Location filter coordinates
    ALBERTA_LAT = 53.9332706
    ALBERTA_LNG = -116.5765035
    ALBERTA_TEXT = "Alberta, Canada"

    CANADA_LAT = 56.130366
    CANADA_LNG = -106.346771
    CANADA_TEXT = "Canada"

    # API settings
    API_URL = "https://api.dupr.gg/player/v1.0/search"
    PLAYER_PROFILE_URL = "https://dashboard.dupr.com/dashboard/player/{player_id}"

    # Rate limiting
    REQUEST_DELAY_MS = 500
    RETRY_COUNT = 3
    RETRY_DELAY_S = 2
    RATE_LIMIT_WAIT_S = 10

    # Default rating for unfound players
    DEFAULT_RATING = 2.5

    # Pool configuration for Partner DUPR format
    POOL_TARGET_SIZE = 5  # Preferred teams per pool
    POOL_MIN_SIZE = 4     # Minimum teams per pool
    COURTS_PER_POOL = 2   # Number of courts assigned per pool
    POOL_POINTS = {
        4: 11,  # Points per game for 4-team pools
        5: 9,   # Points per game for 5-team pools
    }


def load_config(base_path: Optional[Path] = None) -> Config:
    """Load application configuration from files."""
    if base_path is None:
        base_path = Path(__file__).parent.parent

    config_dir = base_path / "config"

    # Load auth token
    token_file = config_dir / "dupr_token.txt"
    if not token_file.exists():
        raise FileNotFoundError(f"Token file not found: {token_file}")

    token = token_file.read_text().strip()
    debug_log(f"Loaded token from {token_file}")

    # Load player overrides
    overrides_file = config_dir / "player_overrides.json"
    overrides: Dict[str, PlayerOverride] = {}

    if overrides_file.exists():
        with open(overrides_file) as f:
            data = json.load(f)
            for override in data.get("overrides", []):
                name_key = override["name"].lower().strip()
                overrides[name_key] = PlayerOverride(
                    name=override["name"],
                    rating=override["rating"],
                    reason=override["reason"]
                )
        debug_log(f"Loaded {len(overrides)} player overrides")

    return Config(
        base_path=base_path,
        token=token,
        overrides=overrides
    )


# User Info configuration

USER_INFO_FILE = "userInfo.json"
MIN_RATING = 2.0
MAX_RATING = 8.0


def validate_rating(rating_str: str) -> float:
    """
    Validate and parse a rating string.

    Args:
        rating_str: String representation of rating

    Returns:
        float: Validated rating

    Raises:
        ValueError: If rating is invalid or out of range
    """
    try:
        rating = float(rating_str)
    except ValueError:
        raise ValueError(f"Invalid rating: '{rating_str}' is not a number")

    if rating < MIN_RATING or rating > MAX_RATING:
        raise ValueError(f"Rating must be between {MIN_RATING} and {MAX_RATING}")

    return rating


def validate_name(name: str) -> str:
    """
    Validate a player name.

    Args:
        name: Player name string

    Returns:
        str: Validated and trimmed name

    Raises:
        ValueError: If name is empty
    """
    name = name.strip()
    if not name:
        raise ValueError("Name cannot be empty")
    return name


@dataclass
class PartialUserInfo:
    """Partial user info loaded from config file."""
    name: Optional[str] = None
    rating: Optional[float] = None
    reason: str = "Player exists on DUPR but not findable via search API"
    missing_fields: List[str] = None

    def __post_init__(self):
        if self.missing_fields is None:
            self.missing_fields = []


def load_user_info(base_path: Optional[Path] = None) -> Optional[UserInfo]:
    """
    Load user info from config/userInfo.json.

    Args:
        base_path: Base path of project (defaults to parent of src/)

    Returns:
        UserInfo if file exists and is complete, None if file doesn't exist

    Raises:
        UserInfoError: If file exists but is invalid JSON
    """
    partial = load_user_info_partial(base_path)
    if partial is None:
        return None

    if partial.missing_fields:
        raise UserInfoError(f"Missing required fields in {USER_INFO_FILE}: {', '.join(partial.missing_fields)}")

    return UserInfo(name=partial.name, rating=partial.rating, reason=partial.reason)


def load_user_info_partial(base_path: Optional[Path] = None) -> Optional[PartialUserInfo]:
    """
    Load partial user info from config/userInfo.json.

    Args:
        base_path: Base path of project (defaults to parent of src/)

    Returns:
        PartialUserInfo if file exists, None if file doesn't exist.
        Check missing_fields to see what's missing.

    Raises:
        UserInfoError: If file exists but is invalid JSON
    """
    if base_path is None:
        base_path = Path(__file__).parent.parent

    user_info_file = base_path / "config" / USER_INFO_FILE

    if not user_info_file.exists():
        debug_log(f"User info file not found: {user_info_file}")
        return None

    try:
        with open(user_info_file) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise UserInfoError(f"Invalid JSON in {USER_INFO_FILE}: {e}")

    partial = PartialUserInfo()
    missing_fields = []

    # Try to load name
    if "name" in data and data["name"]:
        try:
            partial.name = validate_name(data["name"])
        except ValueError:
            missing_fields.append("name")
    else:
        missing_fields.append("name")

    # Try to load rating
    if "rating" in data:
        try:
            partial.rating = validate_rating(str(data["rating"]))
        except ValueError:
            missing_fields.append("rating")
    else:
        missing_fields.append("rating")

    # Load reason if present
    partial.reason = data.get("reason", "Player exists on DUPR but not findable via search API")
    partial.missing_fields = missing_fields

    if partial.name:
        debug_log(f"Loaded partial user info: {partial.name} (rating: {partial.rating})")

    return partial


def save_user_info(user_info: UserInfo, base_path: Optional[Path] = None) -> None:
    """
    Save user info to config/userInfo.json.

    Args:
        user_info: UserInfo to save
        base_path: Base path of project (defaults to parent of src/)
    """
    if base_path is None:
        base_path = Path(__file__).parent.parent

    config_dir = base_path / "config"
    config_dir.mkdir(parents=True, exist_ok=True)

    user_info_file = config_dir / USER_INFO_FILE

    data = {
        "name": user_info.name,
        "rating": user_info.rating,
        "reason": user_info.reason
    }

    with open(user_info_file, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')

    debug_log(f"Saved user info to {user_info_file}")


def prompt_for_name() -> str:
    """Prompt user for their name with validation."""
    while True:
        try:
            name_input = input("Enter your full name (as it appears on DUPR): ")
            return validate_name(name_input)
        except ValueError as e:
            print(f"Error: {e}. Please try again.")
        except EOFError:
            raise UserInfoError("Setup cancelled")


def prompt_for_rating() -> float:
    """Prompt user for their rating with validation."""
    while True:
        try:
            rating_input = input("Enter your DUPR rating: ")
            return validate_rating(rating_input)
        except ValueError as e:
            print(f"Error: {e}. Please try again.")
        except EOFError:
            raise UserInfoError("Setup cancelled")


def prompt_user_info_setup(partial: Optional[PartialUserInfo] = None) -> UserInfo:
    """
    Interactively prompt user for their player info.

    If partial info is provided, only prompts for missing fields.

    Args:
        partial: Optional partial user info with existing values

    Returns:
        UserInfo: User's player info
    """
    if partial is None or not partial.missing_fields:
        # Full setup needed
        print("\nUser configuration not found.")
        print("Let's set up your player profile.\n")
        name = prompt_for_name()
        rating = prompt_for_rating()
        return UserInfo(name=name, rating=rating)

    # Partial setup - only prompt for missing fields
    name = partial.name
    rating = partial.rating
    reason = partial.reason

    if "name" in partial.missing_fields:
        print("\nYour player name is missing from the configuration.")
        name = prompt_for_name()

    if "rating" in partial.missing_fields:
        print("\nYour DUPR rating is missing from the configuration.")
        rating = prompt_for_rating()

    return UserInfo(name=name, rating=rating, reason=reason)


def ensure_user_info(base_path: Optional[Path] = None) -> UserInfo:
    """
    Ensure user info is available, prompting for setup if needed.

    This is the main entry point for user info handling. It:
    1. Tries to load existing user info
    2. If file doesn't exist, prompts for full setup
    3. If file has invalid JSON, warns and prompts for full setup
    4. If file is missing fields, prompts only for missing fields
    5. Saves any newly collected info

    Args:
        base_path: Base path of project

    Returns:
        UserInfo: User's player info
    """
    if base_path is None:
        base_path = Path(__file__).parent.parent

    partial = None

    try:
        partial = load_user_info_partial(base_path)
        if partial and not partial.missing_fields:
            # Complete config loaded
            return UserInfo(name=partial.name, rating=partial.rating, reason=partial.reason)
    except UserInfoError as e:
        # Invalid JSON - warn and prompt for full setup
        print(f"\nWarning: {e}")
        print("Please re-enter your player information.\n")
        partial = None

    # Need to set up or complete user info
    user_info = prompt_user_info_setup(partial)
    save_user_info(user_info, base_path)
    print(f"\nConfiguration saved to ./config/{USER_INFO_FILE}\n")

    return user_info
