"""
DUPR Authentication Module

Provides a browser-based login flow using Playwright to capture the
dupr_access_token cookie and user profile information.

Works on Windows 10/11, macOS, and Linux.
"""

import json
import time
from pathlib import Path
from typing import Optional
from dataclasses import dataclass


DUPR_LOGIN_URL = "https://dashboard.dupr.com/login"
DUPR_DASHBOARD_URL = "https://dashboard.dupr.com/dashboard/"
TOKEN_COOKIE_NAME = "dupr_access_token"
POLL_INTERVAL_S = 0.5
PAGE_LOAD_WAIT_S = 2


@dataclass
class UserInfo:
    """User profile information from DUPR."""
    name: str
    rating: float  # Doubles rating (primary)
    singles_rating: Optional[float] = None
    reason: str = "Auto-populated from DUPR login"


class DUPRAuthenticator:
    """Handles DUPR authentication via browser-based login."""

    def __init__(self, config_dir: Path):
        self.config_dir = config_dir
        self.token_file = config_dir / "dupr_token.txt"
        self.user_info_file = config_dir / "userInfo.json"
        self.player_overrides_file = config_dir / "player_overrides.json"
        self._token: Optional[str] = None
        self._user_info: Optional[UserInfo] = None

    def get_token_interactive(self) -> Optional[str]:
        """
        Opens a browser window for DUPR login, captures auth token and user info.
        Returns the token if successful, None if cancelled.
        """
        from playwright.sync_api import sync_playwright

        self._token = None
        self._user_info = None

        with sync_playwright() as p:
            # Launch browser in headed mode so user can interact
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()

            # Navigate to login page
            page.goto(DUPR_LOGIN_URL)

            # Wait for user to log in by polling for the auth cookie
            print("Please log in to DUPR in the browser window...")
            while True:
                time.sleep(POLL_INTERVAL_S)

                # Check for the auth cookie
                cookies = context.cookies()
                for cookie in cookies:
                    if cookie['name'] == TOKEN_COOKIE_NAME:
                        self._token = cookie['value']
                        break

                if self._token:
                    break

                # Check if browser was closed
                if not page.context.pages:
                    print("Browser closed before login completed.")
                    return None

            # Navigate to dashboard to get user info
            try:
                page.goto(DUPR_DASHBOARD_URL)
                page.wait_for_load_state('networkidle', timeout=10000)
                time.sleep(PAGE_LOAD_WAIT_S)  # Extra wait for JS rendering

                # Extract user info from page
                user_data = self._extract_user_info(page)
                if user_data and user_data.get('name'):
                    self._user_info = UserInfo(
                        name=user_data['name'],
                        rating=user_data.get('doublesRating') or 2.5,
                        singles_rating=user_data.get('singlesRating'),
                    )

            except Exception as e:
                print(f"Warning: Could not extract user info: {e}")

            # Save everything
            self._save_token(self._token)
            if self._user_info:
                self._save_user_info(self._user_info)

            browser.close()

        return self._token

    def _extract_user_info(self, page) -> Optional[dict]:
        """Execute JS to scrape user name and ratings from dashboard."""
        try:
            return page.evaluate('''
                () => {
                    // Get name from the header section
                    const nameEl = document.querySelector('span.text-xl.text-white');
                    const name = nameEl ? nameEl.textContent.trim() : null;

                    if (!name) return null;

                    let doublesRating = null;
                    let singlesRating = null;

                    // Find rating sections by looking for Doubles/Singles labels
                    const spans = document.querySelectorAll('span');
                    for (const span of spans) {
                        const text = span.textContent.trim();

                        if (text === 'Doubles' || text === 'Singles') {
                            // Navigate up to the container with min-width style
                            const container = span.closest('div[style*="min-width"]');
                            if (container) {
                                const ratingEl = container.querySelector('p.text-2xl');
                                if (ratingEl) {
                                    const rating = parseFloat(ratingEl.textContent.trim());
                                    if (!isNaN(rating)) {
                                        if (text === 'Doubles') {
                                            doublesRating = rating;
                                        } else {
                                            singlesRating = rating;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    return {
                        name: name,
                        doublesRating: doublesRating,
                        singlesRating: singlesRating
                    };
                }
            ''')
        except Exception as e:
            print(f"Warning: JS extraction failed: {e}")
            return None

    def _save_token(self, token: str) -> None:
        """Persist token to config file."""
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.token_file.write_text(token)

    def _save_user_info(self, user_info: UserInfo) -> None:
        """Persist user info to JSON file and update player overrides."""
        self.config_dir.mkdir(parents=True, exist_ok=True)

        # Match the existing userInfo.json format
        data = {
            "name": user_info.name,
            "rating": user_info.rating,
            "reason": user_info.reason,
        }

        # Optionally include singles if available
        if user_info.singles_rating:
            data["singles_rating"] = user_info.singles_rating

        self.user_info_file.write_text(json.dumps(data, indent=2))

        # Also update player_overrides.json
        self._update_player_overrides(user_info)

    def _update_player_overrides(self, user_info: UserInfo) -> None:
        """Add or update user in player_overrides.json."""
        # Load existing overrides or create empty structure
        if self.player_overrides_file.exists():
            try:
                with open(self.player_overrides_file) as f:
                    data = json.load(f)
            except (json.JSONDecodeError, IOError):
                data = {"overrides": []}
        else:
            data = {"overrides": []}

        overrides = data.get("overrides", [])

        # Check if user already exists (case-insensitive match)
        user_name_lower = user_info.name.lower().strip()
        existing_idx = None
        for idx, override in enumerate(overrides):
            if override.get("name", "").lower().strip() == user_name_lower:
                existing_idx = idx
                break

        # Create the override entry
        override_entry = {
            "name": user_info.name,
            "rating": user_info.rating,
            "reason": user_info.reason
        }

        if existing_idx is not None:
            # Update existing entry
            overrides[existing_idx] = override_entry
        else:
            # Add new entry
            overrides.append(override_entry)

        data["overrides"] = overrides

        # Write back to file
        with open(self.player_overrides_file, 'w') as f:
            json.dump(data, f, indent=2)
            f.write('\n')

    def has_valid_token(self) -> bool:
        """Check if a token file exists and is non-empty."""
        return self.token_file.exists() and self.token_file.read_text().strip() != ""

    def clear_token(self) -> None:
        """Remove stored token (for logout/refresh scenarios)."""
        if self.token_file.exists():
            self.token_file.unlink()

    @property
    def user_info(self) -> Optional[UserInfo]:
        """Returns the user info captured during login."""
        return self._user_info


def ensure_authenticated(config_dir: Path) -> Optional[str]:
    """
    Convenience function: returns existing token or prompts for login.
    Also populates userInfo.json on fresh login.
    """
    auth = DUPRAuthenticator(config_dir)

    if auth.has_valid_token():
        return auth.token_file.read_text().strip()

    print("No DUPR token found. Opening login window...")
    token = auth.get_token_interactive()

    if token:
        print("Successfully authenticated with DUPR!")
        if auth.user_info:
            print(f"  Welcome, {auth.user_info.name}!")
            print(f"  Doubles: {auth.user_info.rating}")
            if auth.user_info.singles_rating:
                print(f"  Singles: {auth.user_info.singles_rating}")
    else:
        print("Login cancelled or failed.")

    return token
