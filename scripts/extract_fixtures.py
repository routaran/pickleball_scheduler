#!/usr/bin/env python3
"""
Fixture Extraction Script for DUPR Mobile App Development

This script runs the Python desktop app and captures outputs for use as
test fixtures in the TypeScript/React Native implementation.

The desktop app does NOT support a true headless mode (it requires user
authentication via a browser popup), but it does support:

1. File-based input mode:
   python -m src.main --file <player_list.txt> --type <ladder|partner|picklebros>

2. Stdin-based input mode:
   echo "Player1\nPlayer2" | python -m src.main ladder

This script provides utilities to:
- Generate sample input files for different game formats
- Run the Python app with those inputs
- Capture and save the outputs (HTML + console logs)
- Convert outputs to JSON fixture format for TypeScript tests

IMPORTANT: Authentication Requirement
-------------------------------------
The Python desktop app requires a valid DUPR authentication token stored in
config/dupr_token.txt. If the token is missing or expired, the app will:
1. Open a browser window for login
2. Wait for user to complete authentication
3. Continue processing

For automated fixture extraction, ensure you have a valid token before running
this script. You can do this by running the desktop app manually once:
    python -m src.main
and completing the login flow.

Usage Examples
--------------
1. Generate sample input files:
   python scripts/extract_fixtures.py --generate-samples

2. Run extraction with a specific input file:
   python scripts/extract_fixtures.py --input samples/ladder_basic.txt --type ladder

3. Extract fixtures for all sample inputs:
   python scripts/extract_fixtures.py --all

4. Manual extraction (documented steps):
   python scripts/extract_fixtures.py --help-manual
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any


# Project root (parent of scripts/)
PROJECT_ROOT = Path(__file__).parent.parent
FIXTURES_DIR = PROJECT_ROOT / "packages" / "core" / "tests" / "fixtures"
SAMPLES_DIR = PROJECT_ROOT / "scripts" / "samples"


def ensure_directories():
    """Ensure required directories exist."""
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)


# =============================================================================
# Sample Input Generation
# =============================================================================

LADDER_SAMPLES = {
    "ladder_basic_3players": [
        "John Smith",
        "Jane Doe",
        "Bob Johnson"
    ],
    "ladder_single_player": [
        "Solo Player"
    ],
    "ladder_10players": [
        "Alice Anderson",
        "Bob Brown",
        "Charlie Chen",
        "Diana Davis",
        "Edward Evans",
        "Fiona Fisher",
        "George Garcia",
        "Hannah Hill",
        "Ian Ivanov",
        "Julia Jones"
    ],
    "ladder_with_whitespace": [
        "  Padded Name  ",
        "Normal Name",
        "   Leading Spaces",
        "Trailing Spaces   "
    ],
    "ladder_with_duplicates": [
        "John Smith",
        "Jane Doe",
        "John Smith",
        "Bob Johnson"
    ]
}

PARTNER_SAMPLES = {
    "partner_basic_2teams": [
        "John Smith / Jane Doe",
        "Bob Johnson / Alice Anderson"
    ],
    "partner_5teams": [
        "Player A / Player B",
        "Player C / Player D",
        "Player E / Player F",
        "Player G / Player H",
        "Player I / Player J"
    ],
    "partner_with_whitespace": [
        "  John Smith  /  Jane Doe  ",
        "Bob Johnson/Alice Anderson"
    ]
}

PICKLEBROS_SAMPLES = {
    "picklebros_8players": [
        "Player 1",
        "Player 2",
        "Player 3",
        "Player 4",
        "Player 5",
        "Player 6",
        "Player 7",
        "Player 8"
    ],
    "picklebros_12players": [
        "Alpha Player",
        "Beta Player",
        "Gamma Player",
        "Delta Player",
        "Epsilon Player",
        "Zeta Player",
        "Eta Player",
        "Theta Player",
        "Iota Player",
        "Kappa Player",
        "Lambda Player",
        "Mu Player"
    ]
}


def generate_sample_files():
    """Generate sample input files for all game types."""
    ensure_directories()

    # Ladder samples
    for name, players in LADDER_SAMPLES.items():
        filepath = SAMPLES_DIR / f"{name}.txt"
        with open(filepath, 'w') as f:
            f.write('\n'.join(players))
        print(f"Generated: {filepath}")

    # Partner samples
    for name, teams in PARTNER_SAMPLES.items():
        filepath = SAMPLES_DIR / f"{name}.txt"
        with open(filepath, 'w') as f:
            f.write('\n'.join(teams))
        print(f"Generated: {filepath}")

    # PickleBros samples
    for name, players in PICKLEBROS_SAMPLES.items():
        filepath = SAMPLES_DIR / f"{name}.txt"
        with open(filepath, 'w') as f:
            f.write('\n'.join(players))
        print(f"Generated: {filepath}")

    print(f"\nSample files generated in: {SAMPLES_DIR}")


# =============================================================================
# Python App Execution
# =============================================================================

def run_desktop_app(
    input_file: Path,
    game_type: str,
    output_file: Optional[Path] = None,
    capture_output: bool = True
) -> Dict[str, Any]:
    """
    Run the Python desktop app with file-based input.

    Args:
        input_file: Path to the input file containing player/team list
        game_type: One of 'ladder', 'partner', 'picklebros'
        output_file: Optional path for HTML output (defaults to output/<type>.html)
        capture_output: Whether to capture stdout/stderr

    Returns:
        Dict containing:
        - success: bool
        - stdout: str (console output)
        - stderr: str (error/debug output)
        - html_path: Path to generated HTML file
        - html_content: str (HTML content if file exists)
    """
    cmd = [
        sys.executable, "-m", "src.main",
        "--file", str(input_file),
        "--type", game_type
    ]

    if output_file:
        cmd.extend(["--output", str(output_file)])

    result = {
        "success": False,
        "stdout": "",
        "stderr": "",
        "html_path": None,
        "html_content": None,
        "command": " ".join(cmd)
    }

    try:
        proc = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            capture_output=capture_output,
            text=True,
            timeout=300  # 5 minute timeout
        )

        result["success"] = proc.returncode == 0
        result["stdout"] = proc.stdout or ""
        result["stderr"] = proc.stderr or ""

        # Determine HTML output path
        if output_file:
            html_path = output_file
        else:
            html_path = PROJECT_ROOT / "output" / f"{game_type.replace('picklebros', 'picklebros_monday')}.html"

        result["html_path"] = html_path

        if html_path.exists():
            result["html_content"] = html_path.read_text()

    except subprocess.TimeoutExpired:
        result["stderr"] = "Process timed out after 5 minutes"
    except Exception as e:
        result["stderr"] = f"Error running command: {e}"

    return result


def run_desktop_app_stdin(
    input_lines: List[str],
    game_type: str,
    output_file: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Run the Python desktop app with stdin-based input.

    Note: This mode requires a valid token and non-interactive mode.
    It may not work for all scenarios.

    Args:
        input_lines: List of player/team names
        game_type: One of 'ladder', 'partner', 'picklebros'
        output_file: Optional path for HTML output

    Returns:
        Same structure as run_desktop_app()
    """
    cmd = [sys.executable, "-m", "src.main", game_type]

    if output_file:
        cmd.extend(["--output", str(output_file)])

    # Prepare input with a blank line to signal end
    stdin_content = '\n'.join(input_lines) + '\n\n'

    result = {
        "success": False,
        "stdout": "",
        "stderr": "",
        "html_path": None,
        "html_content": None,
        "command": " ".join(cmd) + f" << '{stdin_content[:50]}...'"
    }

    try:
        proc = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            input=stdin_content,
            capture_output=True,
            text=True,
            timeout=300
        )

        result["success"] = proc.returncode == 0
        result["stdout"] = proc.stdout or ""
        result["stderr"] = proc.stderr or ""

        # Determine HTML output path
        output_name = game_type if game_type != "picklebros" else "picklebros_monday"
        html_path = output_file or (PROJECT_ROOT / "output" / f"{output_name}.html")
        result["html_path"] = html_path

        if html_path.exists():
            result["html_content"] = html_path.read_text()

    except subprocess.TimeoutExpired:
        result["stderr"] = "Process timed out after 5 minutes"
    except Exception as e:
        result["stderr"] = f"Error running command: {e}"

    return result


# =============================================================================
# Fixture Creation
# =============================================================================

def create_fixture(
    name: str,
    game_format: str,
    input_data: List[str],
    result: Dict[str, Any],
    description: str = ""
) -> Dict[str, Any]:
    """
    Create a JSON fixture from a run result.

    Args:
        name: Fixture name (e.g., "ladder_basic_3players")
        game_format: Game format type
        input_data: Original input data
        result: Result from run_desktop_app()
        description: Optional description of the test case

    Returns:
        Fixture dict ready to be saved as JSON
    """
    fixture = {
        "name": name,
        "format": game_format,
        "description": description,
        "created_at": datetime.now().isoformat(),
        "input": input_data,
        "expected_output": {
            "success": result["success"],
            "html": result.get("html_content"),
            "console_output": result.get("stdout", ""),
            "errors": result.get("stderr", "")
        },
        "metadata": {
            "command_used": result.get("command", ""),
            "python_version": sys.version
        }
    }

    return fixture


def save_fixture(fixture: Dict[str, Any], output_dir: Optional[Path] = None):
    """Save a fixture to JSON file."""
    output_dir = output_dir or FIXTURES_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{fixture['format']}_{fixture['name']}.json"
    filepath = output_dir / filename

    with open(filepath, 'w') as f:
        json.dump(fixture, f, indent=2)

    print(f"Saved fixture: {filepath}")
    return filepath


# =============================================================================
# Manual Extraction Guide
# =============================================================================

MANUAL_EXTRACTION_GUIDE = """
================================================================================
MANUAL FIXTURE EXTRACTION GUIDE
================================================================================

Since the Python desktop app requires browser-based authentication, fully
automated fixture extraction is not always possible. This guide explains how
to manually capture outputs for test fixtures.

PREREQUISITES
-------------
1. Ensure you have a valid DUPR token in config/dupr_token.txt
   Run `python -m src.main` once and complete the login flow.

2. Have sample input files ready (run: python scripts/extract_fixtures.py --generate-samples)

STEP-BY-STEP EXTRACTION
-----------------------

1. DUPR Ladder Format:

   a) Create input file (e.g., samples/my_ladder_input.txt):
      John Smith
      Jane Doe
      Bob Johnson

   b) Run the app:
      python -m src.main --file samples/my_ladder_input.txt --type ladder --output output/test_ladder.html

   c) Capture the output:
      - Console output shows player lookups and ratings
      - HTML file is saved to output/test_ladder.html

   d) Create fixture manually:
      {
        "name": "my_test_case",
        "format": "ladder",
        "input": ["John Smith", "Jane Doe", "Bob Johnson"],
        "expected_output": {
          "players": [
            {"name": "John Smith", "rating": 4.5, "found": true},
            {"name": "Jane Doe", "rating": 3.8, "found": true},
            {"name": "Bob Johnson", "rating": 2.5, "found": false}
          ],
          "html": "<contents of output/test_ladder.html>"
        }
      }

2. Partner DUPR Format:

   a) Create input file (e.g., samples/my_partner_input.txt):
      John Smith / Jane Doe
      Bob Johnson / Alice Anderson

   b) Run the app:
      python -m src.main --file samples/my_partner_input.txt --type partner

   c) Note the team ratings calculation:
      Team DUPR = 35% of higher rating + 65% of lower rating

3. PickleBros Format:

   a) Create input file with EXACTLY a multiple of 4 players

   b) Run the app:
      python -m src.main --file samples/my_picklebros_input.txt --type picklebros

FIXTURE FILE FORMAT
-------------------
Save fixtures in packages/core/tests/fixtures/ with this structure:

  {
    "name": "descriptive_test_name",
    "format": "ladder|partner|picklebros",
    "description": "What this test case validates",
    "input": [...],  // Input data (array of strings)
    "expected_output": {
      "success": true|false,
      "players": [...],  // Parsed player data with ratings
      "teams": [...],    // For partner format: team data
      "html": "...",     // Generated HTML output
    }
  }

TIPS
----
- Run with --debug flag to see detailed API calls: python -m src.main --debug ...
- Token expires periodically; you'll be prompted to re-authenticate
- Player lookups are cached in config/player_registry.json
- Default rating (2.5) is used when a player is not found

================================================================================
"""


# =============================================================================
# SAMPLE FIXTURE JSON FORMATS
# =============================================================================

SAMPLE_LADDER_FIXTURE = {
    "description": "DUPR Ladder game type - individual players with ratings",
    "game_type": "dupr_ladder",
    "players": [
        {
            "name": "John Smith",
            "dupr_id": "ABC123",
            "dupr_name": "John A. Smith",
            "rating": 4.25,
            "singles_rating": 3.95,
            "doubles_rating": 4.25,
            "location": "Edmonton, AB, CA",
            "profile_url": "https://dashboard.dupr.com/dashboard/player/12345",
            "found": True,
            "search_method": "exact_match"
        },
        {
            "name": "Jane Doe",
            "dupr_id": "DEF456",
            "dupr_name": "Jane Doe",
            "rating": 3.75,
            "singles_rating": None,
            "doubles_rating": 3.75,
            "location": "Calgary, AB, CA",
            "profile_url": "https://dashboard.dupr.com/dashboard/player/67890",
            "found": True,
            "search_method": "fuzzy_match"
        },
        {
            "name": "Unknown Player",
            "dupr_id": None,
            "dupr_name": None,
            "rating": 3.0,
            "singles_rating": None,
            "doubles_rating": None,
            "location": None,
            "profile_url": None,
            "found": False,
            "search_method": "not_found"
        }
    ],
    "metadata": {
        "captured_at": "2026-02-01T12:00:00",
        "source": "manual_capture",
        "notes": "Sample fixture for testing ladder functionality"
    }
}

SAMPLE_PARTNER_FIXTURE = {
    "description": "Partner DUPR game type - teams of two players",
    "game_type": "partner_dupr",
    "teams": [
        {
            "player1": {
                "name": "John Smith",
                "dupr_id": "ABC123",
                "rating": 4.25,
                "found": True
            },
            "player2": {
                "name": "Jane Doe",
                "dupr_id": "DEF456",
                "rating": 3.75,
                "found": True
            },
            "team_rating": 3.925,
            "notes": "Team rating formula: 35% of higher + 65% of lower"
        },
        {
            "player1": {
                "name": "Bob Wilson",
                "dupr_id": "GHI789",
                "rating": 3.50,
                "found": True
            },
            "player2": {
                "name": "Alice Brown",
                "dupr_id": "JKL012",
                "rating": 3.25,
                "found": True
            },
            "team_rating": 3.3375
        }
    ],
    "metadata": {
        "captured_at": "2026-02-01T12:00:00",
        "source": "manual_capture",
        "notes": "Sample fixture for testing partner functionality"
    }
}

SAMPLE_PICKLEBROS_FIXTURE = {
    "description": "PickleBros Monday game type - fixed 4-player pools",
    "game_type": "picklebros_monday",
    "pools": [
        {
            "pool_name": "A",
            "players": [
                {"name": "Player 1", "dupr_id": "P001", "rating": 4.5, "found": True},
                {"name": "Player 2", "dupr_id": "P002", "rating": 4.3, "found": True},
                {"name": "Player 3", "dupr_id": "P003", "rating": 4.1, "found": True},
                {"name": "Player 4", "dupr_id": "P004", "rating": 4.0, "found": True}
            ],
            "notes": "Highest rated pool"
        },
        {
            "pool_name": "B",
            "players": [
                {"name": "Player 5", "dupr_id": "P005", "rating": 3.8, "found": True},
                {"name": "Player 6", "dupr_id": "P006", "rating": 3.6, "found": True},
                {"name": "Player 7", "dupr_id": "P007", "rating": 3.4, "found": True},
                {"name": "Player 8", "dupr_id": "P008", "rating": 3.2, "found": True}
            ],
            "notes": "Second pool"
        }
    ],
    "constraints": {
        "players_per_pool": 4,
        "minimum_pools": 2,
        "total_players_must_be_multiple_of": 4
    },
    "metadata": {
        "captured_at": "2026-02-01T12:00:00",
        "source": "manual_capture",
        "notes": "Sample fixture for testing picklebros functionality"
    }
}

# Player Registry format (from config/player_registry.json)
SAMPLE_PLAYER_REGISTRY = {
    "john smith": {
        "dupr_id": "ABC123",
        "dupr_name": "John A. Smith",
        "rating": 4.25,
        "location": "Edmonton, AB, CA",
        "last_updated": "2026-02-01T12:00:00.000000"
    },
    "jane doe": {
        "dupr_id": "DEF456",
        "dupr_name": "Jane Doe",
        "rating": 3.75,
        "location": "Calgary, AB, CA",
        "last_updated": "2026-02-01T12:00:00.000000"
    }
}

# DUPR API Response format (what the app receives from DUPR)
SAMPLE_DUPR_API_RESPONSE = {
    "status": "SUCCESS",
    "result": {
        "hits": [
            {
                "id": 12345,
                "fullName": "John A. Smith",
                "duprId": "ABC123",
                "shortAddress": "Edmonton, AB, CA",
                "ratings": {
                    "singles": 3.95,
                    "doubles": 4.25,
                    "singlesVerified": True,
                    "doublesVerified": True
                }
            },
            {
                "id": 67890,
                "fullName": "John B. Smith",
                "duprId": "XYZ789",
                "shortAddress": "Vancouver, BC, CA",
                "ratings": {
                    "singles": "NR",
                    "doubles": 3.50,
                    "singlesVerified": "NR",
                    "doublesVerified": False
                }
            }
        ],
        "total": 2
    }
}


def save_sample_fixtures_to_json():
    """Save sample fixture formats as JSON files for reference."""
    ensure_directories()

    samples = {
        "sample_ladder": SAMPLE_LADDER_FIXTURE,
        "sample_partner": SAMPLE_PARTNER_FIXTURE,
        "sample_picklebros": SAMPLE_PICKLEBROS_FIXTURE,
        "sample_player_registry": SAMPLE_PLAYER_REGISTRY,
        "sample_dupr_api_response": SAMPLE_DUPR_API_RESPONSE,
    }

    for name, data in samples.items():
        filepath = FIXTURES_DIR / f"{name}.json"
        if not filepath.exists():
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Created sample fixture: {filepath}")
        else:
            print(f"Sample fixture already exists: {filepath}")


# =============================================================================
# CLI Interface
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Extract test fixtures from Python desktop app",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Generate sample input files:
    python scripts/extract_fixtures.py --generate-samples

  Run extraction with a sample file:
    python scripts/extract_fixtures.py --input scripts/samples/ladder_basic_3players.txt --type ladder

  Show manual extraction guide:
    python scripts/extract_fixtures.py --help-manual
"""
    )

    parser.add_argument(
        "--generate-samples",
        action="store_true",
        help="Generate sample input files in scripts/samples/"
    )

    parser.add_argument(
        "--input",
        type=Path,
        help="Input file to process"
    )

    parser.add_argument(
        "--type",
        choices=["ladder", "partner", "picklebros"],
        help="Game type for the input file"
    )

    parser.add_argument(
        "--output",
        type=Path,
        help="Output HTML file path"
    )

    parser.add_argument(
        "--save-fixture",
        action="store_true",
        help="Save result as a JSON fixture"
    )

    parser.add_argument(
        "--fixture-name",
        type=str,
        help="Name for the fixture (defaults to input filename)"
    )

    parser.add_argument(
        "--help-manual",
        action="store_true",
        help="Show manual extraction guide"
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Extract fixtures for all sample files"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without running"
    )

    parser.add_argument(
        "--show-formats",
        action="store_true",
        help="Display sample fixture JSON formats for ladder, partner, and picklebros"
    )

    parser.add_argument(
        "--create-sample-fixtures",
        action="store_true",
        help="Create sample fixture JSON files in packages/core/tests/fixtures/"
    )

    args = parser.parse_args()

    # Ensure directories exist
    ensure_directories()

    if args.help_manual:
        print(MANUAL_EXTRACTION_GUIDE)
        return 0

    if args.show_formats:
        print("=" * 70)
        print("SAMPLE FIXTURE JSON FORMATS")
        print("=" * 70)

        print("\n1. LADDER FIXTURE FORMAT (dupr_ladder):")
        print("-" * 50)
        print(json.dumps(SAMPLE_LADDER_FIXTURE, indent=2, default=str))

        print("\n2. PARTNER FIXTURE FORMAT (partner_dupr):")
        print("-" * 50)
        print(json.dumps(SAMPLE_PARTNER_FIXTURE, indent=2, default=str))

        print("\n3. PICKLEBROS FIXTURE FORMAT (picklebros_monday):")
        print("-" * 50)
        print(json.dumps(SAMPLE_PICKLEBROS_FIXTURE, indent=2, default=str))

        print("\n4. PLAYER REGISTRY FORMAT (config/player_registry.json):")
        print("-" * 50)
        print(json.dumps(SAMPLE_PLAYER_REGISTRY, indent=2, default=str))

        print("\n5. DUPR API RESPONSE FORMAT:")
        print("-" * 50)
        print(json.dumps(SAMPLE_DUPR_API_RESPONSE, indent=2, default=str))

        return 0

    if args.create_sample_fixtures:
        print("Creating sample fixture JSON files...")
        save_sample_fixtures_to_json()
        print(f"\nSample fixtures directory: {FIXTURES_DIR}")
        return 0

    if args.generate_samples:
        generate_sample_files()
        return 0

    if args.all:
        print("Extracting fixtures for all sample files...")
        print("NOTE: This requires valid authentication and may open browser windows.")
        print()

        # First generate samples if they don't exist
        if not SAMPLES_DIR.exists() or not list(SAMPLES_DIR.glob("*.txt")):
            print("Generating sample files first...")
            generate_sample_files()
            print()

        # Process each sample
        for sample_file in sorted(SAMPLES_DIR.glob("*.txt")):
            name = sample_file.stem

            # Determine game type from filename
            if name.startswith("ladder"):
                game_type = "ladder"
            elif name.startswith("partner"):
                game_type = "partner"
            elif name.startswith("picklebros"):
                game_type = "picklebros"
            else:
                print(f"Skipping unknown format: {sample_file}")
                continue

            print(f"Processing: {sample_file} (type: {game_type})")

            if args.dry_run:
                print(f"  Would run: python -m src.main --file {sample_file} --type {game_type}")
                continue

            # Read input
            with open(sample_file) as f:
                input_data = [line.strip() for line in f if line.strip()]

            # Run extraction
            result = run_desktop_app(sample_file, game_type)

            if result["success"]:
                print(f"  Success! HTML saved to: {result['html_path']}")

                if args.save_fixture:
                    fixture = create_fixture(
                        name=name,
                        game_format=game_type,
                        input_data=input_data,
                        result=result,
                        description=f"Auto-extracted from {sample_file.name}"
                    )
                    save_fixture(fixture)
            else:
                print(f"  Failed: {result['stderr'][:200]}")

            print()

        return 0

    if args.input:
        if not args.type:
            print("ERROR: --type is required when using --input", file=sys.stderr)
            return 1

        if not args.input.exists():
            print(f"ERROR: Input file not found: {args.input}", file=sys.stderr)
            return 1

        print(f"Processing: {args.input}")
        print(f"Game type: {args.type}")

        if args.dry_run:
            print(f"Would run: python -m src.main --file {args.input} --type {args.type}")
            return 0

        # Read input
        with open(args.input) as f:
            input_data = [line.strip() for line in f if line.strip()]

        # Run extraction
        result = run_desktop_app(args.input, args.type, args.output)

        if result["success"]:
            print(f"Success! HTML saved to: {result['html_path']}")
            print("\nConsole output:")
            print(result["stdout"])

            if args.save_fixture:
                fixture_name = args.fixture_name or args.input.stem
                fixture = create_fixture(
                    name=fixture_name,
                    game_format=args.type,
                    input_data=input_data,
                    result=result,
                    description=f"Extracted from {args.input.name}"
                )
                save_fixture(fixture)
        else:
            print(f"Failed!")
            print(f"Stderr: {result['stderr']}")
            return 1

        return 0

    # No action specified
    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
