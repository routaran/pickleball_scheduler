"""Tests for configuration module."""

import json
import pytest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from src.config import (
    load_config, PlayerOverride, Config,
    UserInfo, UserInfoError, PartialUserInfo,
    validate_rating, validate_name,
    load_user_info, load_user_info_partial, save_user_info,
    prompt_user_info_setup, ensure_user_info,
    prompt_for_name, prompt_for_rating,
    MIN_RATING, MAX_RATING
)


class TestLoadConfig:
    """Tests for load_config function."""

    def test_loads_token_from_file(self):
        """Test that token is loaded from config file."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            # Create token file
            token_file = config_dir / "dupr_token.txt"
            token_file.write_text("test_token_123")

            config = load_config(base_path)
            assert config.token == "test_token_123"

    def test_loads_player_overrides(self):
        """Test that player overrides are loaded correctly."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            # Create token file
            (config_dir / "dupr_token.txt").write_text("test_token")

            # Create overrides file
            overrides_data = {
                "overrides": [
                    {
                        "name": "John Doe",
                        "rating": 4.5,
                        "reason": "Test override"
                    },
                    {
                        "name": "Jane Smith",
                        "rating": 3.0,
                        "reason": "Another test"
                    }
                ]
            }
            (config_dir / "player_overrides.json").write_text(
                json.dumps(overrides_data)
            )

            config = load_config(base_path)

            assert len(config.overrides) == 2
            assert "john doe" in config.overrides
            assert config.overrides["john doe"].rating == 4.5
            assert "jane smith" in config.overrides

    def test_raises_error_when_token_missing(self):
        """Test that FileNotFoundError is raised when token file is missing."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            with pytest.raises(FileNotFoundError):
                load_config(base_path)

    def test_handles_missing_overrides_file(self):
        """Test that missing overrides file is handled gracefully."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            (config_dir / "dupr_token.txt").write_text("test_token")

            config = load_config(base_path)
            assert len(config.overrides) == 0

    def test_override_name_normalization(self):
        """Test that override names are normalized (lowercase, trimmed)."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            (config_dir / "dupr_token.txt").write_text("test_token")

            overrides_data = {
                "overrides": [
                    {
                        "name": "  JOHN DOE  ",
                        "rating": 4.5,
                        "reason": "Test"
                    }
                ]
            }
            (config_dir / "player_overrides.json").write_text(
                json.dumps(overrides_data)
            )

            config = load_config(base_path)
            assert "john doe" in config.overrides


class TestConfigConstants:
    """Tests for Config class constants."""

    def test_default_rating(self):
        """Test that default rating is 2.5."""
        assert Config.DEFAULT_RATING == 2.5

    def test_location_constants(self):
        """Test that location constants are defined."""
        assert Config.ALBERTA_TEXT == "Alberta, Canada"
        assert Config.CANADA_TEXT == "Canada"
        assert isinstance(Config.ALBERTA_LAT, float)
        assert isinstance(Config.ALBERTA_LNG, float)

    def test_api_url(self):
        """Test API URL is correct."""
        assert "dupr.gg" in Config.API_URL
        assert "search" in Config.API_URL


class TestValidateRating:
    """Tests for rating validation."""

    def test_valid_rating(self):
        """Test that valid ratings are accepted."""
        assert validate_rating("3.93") == 3.93
        assert validate_rating("2.0") == 2.0
        assert validate_rating("8.0") == 8.0
        assert validate_rating("5.5") == 5.5

    def test_invalid_non_numeric(self):
        """Test that non-numeric input raises ValueError."""
        with pytest.raises(ValueError, match="not a number"):
            validate_rating("abc")

    def test_invalid_below_min(self):
        """Test that rating below minimum raises ValueError."""
        with pytest.raises(ValueError, match=f"between {MIN_RATING}"):
            validate_rating("1.5")

    def test_invalid_above_max(self):
        """Test that rating above maximum raises ValueError."""
        with pytest.raises(ValueError, match=f"between {MIN_RATING}"):
            validate_rating("9.0")

    def test_boundary_values(self):
        """Test boundary values are accepted."""
        assert validate_rating(str(MIN_RATING)) == MIN_RATING
        assert validate_rating(str(MAX_RATING)) == MAX_RATING


class TestValidateName:
    """Tests for name validation."""

    def test_valid_name(self):
        """Test that valid names are accepted and trimmed."""
        assert validate_name("Ravi Kalluri") == "Ravi Kalluri"
        assert validate_name("  John Doe  ") == "John Doe"

    def test_empty_name(self):
        """Test that empty name raises ValueError."""
        with pytest.raises(ValueError, match="cannot be empty"):
            validate_name("")

    def test_whitespace_only(self):
        """Test that whitespace-only name raises ValueError."""
        with pytest.raises(ValueError, match="cannot be empty"):
            validate_name("   ")


class TestLoadUserInfo:
    """Tests for load_user_info function."""

    def test_loads_valid_config(self):
        """Test loading a valid user info file."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {
                "name": "Ravi Kalluri",
                "rating": 3.93,
                "reason": "Test reason"
            }
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            user_info = load_user_info(base_path)

            assert user_info is not None
            assert user_info.name == "Ravi Kalluri"
            assert user_info.rating == 3.93
            assert user_info.reason == "Test reason"

    def test_returns_none_when_file_missing(self):
        """Test that None is returned when file doesn't exist."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_info = load_user_info(base_path)
            assert user_info is None

    def test_raises_on_invalid_json(self):
        """Test that invalid JSON raises UserInfoError."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            (config_dir / "userInfo.json").write_text("not valid json")

            with pytest.raises(UserInfoError, match="Invalid JSON"):
                load_user_info(base_path)

    def test_raises_on_missing_name(self):
        """Test that missing name field raises UserInfoError."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {"rating": 3.93}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            with pytest.raises(UserInfoError, match="Missing required fields.*name"):
                load_user_info(base_path)

    def test_raises_on_missing_rating(self):
        """Test that missing rating field raises UserInfoError."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {"name": "Ravi Kalluri"}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            with pytest.raises(UserInfoError, match="Missing required fields.*rating"):
                load_user_info(base_path)

    def test_raises_on_invalid_rating(self):
        """Test that invalid rating (out of range) is treated as missing field."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {"name": "Ravi Kalluri", "rating": 1.5}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            # Invalid rating is now treated as a missing field
            with pytest.raises(UserInfoError, match="Missing required fields.*rating"):
                load_user_info(base_path)

    def test_uses_default_reason(self):
        """Test that default reason is used when not specified."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {"name": "Ravi Kalluri", "rating": 3.93}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            user_info = load_user_info(base_path)
            assert "DUPR" in user_info.reason


class TestSaveUserInfo:
    """Tests for save_user_info function."""

    def test_saves_user_info(self):
        """Test that user info is saved correctly."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)

            user_info = UserInfo(name="Ravi Kalluri", rating=3.93, reason="Test")
            save_user_info(user_info, base_path)

            # Read back and verify
            user_info_file = base_path / "config" / "userInfo.json"
            assert user_info_file.exists()

            with open(user_info_file) as f:
                data = json.load(f)

            assert data["name"] == "Ravi Kalluri"
            assert data["rating"] == 3.93
            assert data["reason"] == "Test"

    def test_creates_config_directory(self):
        """Test that config directory is created if missing."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            # config directory doesn't exist

            user_info = UserInfo(name="Ravi Kalluri", rating=3.93)
            save_user_info(user_info, base_path)

            assert (base_path / "config").exists()
            assert (base_path / "config" / "userInfo.json").exists()


class TestLoadUserInfoPartial:
    """Tests for load_user_info_partial function."""

    def test_loads_complete_config(self):
        """Test loading complete user info."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {"name": "Ravi Kalluri", "rating": 3.93}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            partial = load_user_info_partial(base_path)

            assert partial.name == "Ravi Kalluri"
            assert partial.rating == 3.93
            assert partial.missing_fields == []

    def test_detects_missing_name(self):
        """Test that missing name is detected."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {"rating": 3.93}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            partial = load_user_info_partial(base_path)

            assert partial.name is None
            assert partial.rating == 3.93
            assert "name" in partial.missing_fields

    def test_detects_missing_rating(self):
        """Test that missing rating is detected."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {"name": "Ravi Kalluri"}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            partial = load_user_info_partial(base_path)

            assert partial.name == "Ravi Kalluri"
            assert partial.rating is None
            assert "rating" in partial.missing_fields


class TestPromptUserInfoSetup:
    """Tests for prompt_user_info_setup function."""

    def test_prompts_for_name_and_rating(self):
        """Test that name and rating are prompted."""
        inputs = iter(["Ravi Kalluri", "3.93"])
        with patch('builtins.input', side_effect=lambda _: next(inputs)):
            user_info = prompt_user_info_setup()

            assert user_info.name == "Ravi Kalluri"
            assert user_info.rating == 3.93

    def test_reprompts_on_invalid_name(self):
        """Test that invalid name causes re-prompt."""
        inputs = iter(["", "Ravi Kalluri", "3.93"])
        with patch('builtins.input', side_effect=lambda _: next(inputs)):
            user_info = prompt_user_info_setup()
            assert user_info.name == "Ravi Kalluri"

    def test_reprompts_on_invalid_rating(self):
        """Test that invalid rating causes re-prompt."""
        inputs = iter(["Ravi Kalluri", "abc", "1.5", "3.93"])
        with patch('builtins.input', side_effect=lambda _: next(inputs)):
            user_info = prompt_user_info_setup()
            assert user_info.rating == 3.93

    def test_raises_on_eof(self):
        """Test that EOF raises UserInfoError."""
        with patch('builtins.input', side_effect=EOFError):
            with pytest.raises(UserInfoError, match="cancelled"):
                prompt_user_info_setup()

    def test_partial_prompts_only_for_name(self):
        """Test that partial config with only rating prompts for name only."""
        partial = PartialUserInfo(name=None, rating=3.93, missing_fields=["name"])
        inputs = iter(["Ravi Kalluri"])
        with patch('builtins.input', side_effect=lambda _: next(inputs)):
            user_info = prompt_user_info_setup(partial)

            assert user_info.name == "Ravi Kalluri"
            assert user_info.rating == 3.93

    def test_partial_prompts_only_for_rating(self):
        """Test that partial config with only name prompts for rating only."""
        partial = PartialUserInfo(name="Ravi Kalluri", rating=None, missing_fields=["rating"])
        inputs = iter(["3.93"])
        with patch('builtins.input', side_effect=lambda _: next(inputs)):
            user_info = prompt_user_info_setup(partial)

            assert user_info.name == "Ravi Kalluri"
            assert user_info.rating == 3.93


class TestEnsureUserInfo:
    """Tests for ensure_user_info function."""

    def test_loads_existing_config(self):
        """Test that existing config is loaded silently."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            user_data = {"name": "Ravi Kalluri", "rating": 3.93}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            user_info = ensure_user_info(base_path)

            assert user_info.name == "Ravi Kalluri"
            assert user_info.rating == 3.93

    def test_prompts_when_file_missing(self):
        """Test that setup is prompted when file is missing."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            inputs = iter(["Ravi Kalluri", "3.93"])
            with patch('builtins.input', side_effect=lambda _: next(inputs)):
                user_info = ensure_user_info(base_path)

            assert user_info.name == "Ravi Kalluri"
            # Verify file was saved
            assert (config_dir / "userInfo.json").exists()

    def test_prompts_when_json_invalid(self):
        """Test that full setup is prompted when JSON is invalid."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            (config_dir / "userInfo.json").write_text("not valid json")

            inputs = iter(["Ravi Kalluri", "3.93"])
            with patch('builtins.input', side_effect=lambda _: next(inputs)):
                user_info = ensure_user_info(base_path)

            assert user_info.name == "Ravi Kalluri"

    def test_prompts_only_for_missing_name(self):
        """Test that only name is prompted when rating exists."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            # File has rating but no name
            user_data = {"rating": 3.93}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            inputs = iter(["Ravi Kalluri"])
            with patch('builtins.input', side_effect=lambda _: next(inputs)):
                user_info = ensure_user_info(base_path)

            assert user_info.name == "Ravi Kalluri"
            assert user_info.rating == 3.93

    def test_prompts_only_for_missing_rating(self):
        """Test that only rating is prompted when name exists."""
        with TemporaryDirectory() as tmpdir:
            base_path = Path(tmpdir)
            config_dir = base_path / "config"
            config_dir.mkdir()

            # File has name but no rating
            user_data = {"name": "Ravi Kalluri"}
            (config_dir / "userInfo.json").write_text(json.dumps(user_data))

            inputs = iter(["3.93"])
            with patch('builtins.input', side_effect=lambda _: next(inputs)):
                user_info = ensure_user_info(base_path)

            assert user_info.name == "Ravi Kalluri"
            assert user_info.rating == 3.93
