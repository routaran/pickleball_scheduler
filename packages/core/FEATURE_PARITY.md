# Feature Parity Specification

This document defines the input validation rules and format specifications for the TypeScript implementation to ensure feature parity with the Python desktop application.

---

## Table of Contents

1. [DUPR Ladder Format](#dupr-ladder-format)
2. [Partner DUPR Format](#partner-dupr-format)
3. [PickleBros Monday Format](#picklebros-monday-format)
4. [Common Validation Rules](#common-validation-rules)
5. [Rating Validation](#rating-validation)
6. [Override Behavior (P0-SPEC-3)](#override-behavior-p0-spec-3)
7. [Player Lookup Behavior](#player-lookup-behavior)
8. [HTML Output Format (P0-SPEC-4)](#p0-spec-4-html-output-format)

---

## DUPR Ladder Format

### Input Format

Players are entered as a plain text list, **one player name per line**.

#### Valid Input Example

```
John Smith
Jane Doe
Bob Johnson
Alice Williams
```

### Validation Rules

| Rule | Value | Description |
|------|-------|-------------|
| **Max players** | No hard limit (recommended: 100) | The pool distribution algorithm handles any number of players |
| **Min players** | 1 | At least one player required |
| **Format** | One name per line | Each line is treated as a single player name |
| **Whitespace handling** | Trimmed | Leading/trailing whitespace is stripped from each line |
| **Empty lines** | Skipped | Empty lines (or lines with only whitespace) are ignored |
| **Allowed characters** | Any UTF-8 | Names may contain letters, spaces, hyphens, apostrophes, accents, etc. |

### Parsing Algorithm

From `game_types.py`:

```python
def parse_dupr_ladder_players(file_path: Path) -> List[str]:
    players = []
    for line in f:
        name = line.strip()  # Trim whitespace
        if name:             # Skip empty lines
            players.append(name)
    return players
```

### Pool Distribution

Players are distributed into pools of 4-5 players:

| Total Players | Pool Sizes | Notes |
|---------------|------------|-------|
| 1-3 | Single pool (all players) | Edge case: fewer than min pool size |
| 4-5 | A: 4-5 | Single pool |
| 6-8 | A: 3-4, B: 3-4 | Two pools |
| 9-10 | A: 4, B: 5 or A: 5, B: 5 | Two pools |
| 18 | A: 4, B: 4, C: 5, D: 5 | Lower pools get extras |

**Key algorithm behavior:**
- Players sorted by rating (highest first)
- Pool A = highest rated players
- **Lower pools (lower rated) get extra players first** to avoid byes
- Target pool size: 5 players
- Minimum pool size: 4 players

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty input | Returns empty list, no pools generated |
| Single player | Single pool "A" with one player |
| Duplicate names | Both entries processed (API lookup may return same player) |
| Name not found | Uses default rating (2.5), marked as "not found" |

---

## Partner DUPR Format

### Input Format

Teams are entered as a plain text list, **one team per line**, with players separated by `/`.

#### Valid Input Example

```
John Smith / Jane Doe
Bob Johnson / Alice Williams
Charlie Brown / Diana Prince
```

### Validation Rules

| Rule | Value | Description |
|------|-------|-------------|
| **Max teams** | No hard limit (recommended: 50) | Pool distribution handles any number |
| **Min teams** | 1 | At least one team required |
| **Team format** | `Player1 / Player2` | Two players separated by forward slash |
| **Delimiter** | `/` | Forward slash only (comma not supported in current implementation) |
| **Whitespace handling** | Trimmed | Whitespace around names and delimiters is stripped |
| **Empty lines** | Skipped | Empty lines are ignored |

### Parsing Algorithm

From `game_types.py`:

```python
def parse_partner_dupr_teams(file_path: Path) -> List[Team]:
    teams = []
    for line in f:
        line = line.strip()
        if not line:
            continue  # Skip empty lines

        if "/" not in line:
            debug_log(f"Skipping invalid team line: {line}")
            continue  # Skip lines without delimiter

        parts = line.split("/")
        if len(parts) != 2:
            debug_log(f"Skipping malformed team line: {line}")
            continue  # Skip lines with multiple delimiters

        player1 = parts[0].strip()
        player2 = parts[1].strip()

        if player1 and player2:  # Both names must be non-empty
            teams.append(Team(player1=player1, player2=player2))
    return teams
```

### Team Rating Calculation

Team DUPR is calculated using the official formula:
- **35% of higher rating + 65% of lower rating**

```python
def calculate_team_rating(rating1: float, rating2: float) -> float:
    higher = max(rating1, rating2)
    lower = min(rating1, rating2)
    return round(0.35 * higher + 0.65 * lower, 3)
```

**Examples:**
| Player 1 | Player 2 | Team DUPR |
|----------|----------|-----------|
| 4.0 | 4.0 | 4.0 |
| 4.0 | 3.0 | 3.35 |
| 3.5 | 3.0 | 3.175 |
| 3.0 | 2.5 | 2.675 |

### Pool Distribution for Teams

Teams distributed into pools of 4-5 teams each:

| Config | Value | Description |
|--------|-------|-------------|
| Target pool size | 5 teams | Preferred teams per pool |
| Min pool size | 4 teams | Minimum teams per pool |
| Courts per pool | 2 | Number of courts assigned |
| Points (4-team pool) | 11 | Points per game |
| Points (5-team pool) | 9 | Points per game |

**Key behavior:**
- Teams sorted by team rating (highest first)
- Pool A = highest rated teams
- **Larger pools go to higher-rated groups** (opposite of ladder)

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty input | Returns empty list |
| Line without `/` | Line skipped with debug log |
| Line with multiple `/` | Line skipped (e.g., "A / B / C") |
| Empty player name | Team skipped (e.g., "John / " or " / Jane") |
| Same player twice | Accepted (not validated at parse time) |

### Invalid Input Examples

```
John Smith                    # No delimiter - SKIPPED
John Smith, Jane Doe          # Comma not supported - SKIPPED
John / Jane / Bob             # Too many delimiters - SKIPPED
John /                        # Empty second player - SKIPPED
/ Jane                        # Empty first player - SKIPPED
```

---

## PickleBros Monday Format

### Input Format

Same as DUPR Ladder: players entered as a plain text list, **one player name per line**.

#### Valid Input Example

```
John Smith
Jane Doe
Bob Johnson
Alice Williams
Charlie Brown
Diana Prince
Edward Norton
Fiona Apple
```

### Validation Rules

| Rule | Value | Description |
|------|-------|-------------|
| **Player count** | Must be multiple of 4 | Fixed 4-player pools |
| **Min players** | 4 | At least one full pool required |
| **Format** | One name per line | Same as DUPR Ladder |
| **Whitespace handling** | Trimmed | Same as DUPR Ladder |
| **Empty lines** | Skipped | Same as DUPR Ladder |

### Pool Distribution

**Fixed 4-player pools** - this is the key difference from DUPR Ladder:

| Total Players | Pool Sizes | Notes |
|---------------|------------|-------|
| 4 | A: 4 | Single pool |
| 8 | A: 4, B: 4 | Two pools |
| 12 | A: 4, B: 4, C: 4 | Three pools |
| 16 | A: 4, B: 4, C: 4, D: 4 | Four pools |

From `html_generator.py`:

```python
def distribute_players_to_picklebros_pools(players: List[PlayerWithRating]) -> List[PlayerPool]:
    """
    Player count MUST be a multiple of 4 (validated before calling this function).

    Algorithm:
    1. Sort players by rating (highest first)
    2. Create N pools where N = len(players) / 4
    3. Each pool gets exactly 4 players
    """
    sorted_players = sorted(players, key=lambda p: p.rating, reverse=True)
    num_pools = N // 4

    for i in range(num_pools):
        pool_name = chr(65 + i)  # 'A', 'B', 'C', 'D'...
        pool_players = sorted_players[player_index:player_index + 4]
        pools.append(PlayerPool(name=pool_name, players=pool_players))

    return pools
```

### Validation Requirements

**IMPORTANT:** Player count validation MUST happen before calling the distribution function:

```
if len(players) % 4 != 0:
    raise ValidationError(f"Player count must be multiple of 4. Got {len(players)} players.")
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| 0 players | Returns empty list |
| 1-3 players | Invalid - must validate before calling |
| 5 players | Invalid - must validate before calling |
| 7 players | Invalid - must validate before calling |

---

## Common Validation Rules

### Name Validation

From `config.py`:

```python
def validate_name(name: str) -> str:
    """
    Validate a player name.

    Returns:
        str: Validated and trimmed name

    Raises:
        ValueError: If name is empty
    """
    name = name.strip()
    if not name:
        raise ValueError("Name cannot be empty")
    return name
```

| Rule | Constraint |
|------|------------|
| Minimum length | 1 character (after trim) |
| Maximum length | No limit |
| Allowed characters | Any UTF-8 characters |
| Trimming | Leading/trailing whitespace removed |

### Player Name Normalization

For lookup and matching purposes:
- Names are compared case-insensitively
- Keys in registry use lowercase: `name_key = name.lower().strip()`

---

## Rating Validation

From `config.py`:

```python
MIN_RATING = 2.0
MAX_RATING = 8.0

def validate_rating(rating_str: str) -> float:
    """
    Validate and parse a rating string.

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
```

| Rule | Value |
|------|-------|
| Minimum rating | 2.0 |
| Maximum rating | 8.0 |
| Default rating (unfound players) | 2.5 |
| Precision | 3 decimal places (e.g., 3.927) |

### Rating Tier Colors

Used for visual display in HTML output:

| Tier | Rating Range | Color |
|------|--------------|-------|
| High | >= 4.0 | Green (`#059669`) |
| Mid | >= 3.0 and < 4.0 | Blue (`#2563eb`) |
| Low | < 3.0 | Amber (`#d97706`) |

### Team Rating Tiers

For Partner DUPR team display:

| Tier | Rating Range | Description |
|------|--------------|-------------|
| Highest | >= 4.0 | Top tier teams |
| High | >= 3.5 and < 4.0 | Strong teams |
| Mid | >= 3.0 and < 3.5 | Average teams |
| Low | < 3.0 | Lower tier teams |

---

## Override Behavior (P0-SPEC-3)

Player overrides allow administrators to specify hardcoded ratings for players who cannot be found via the DUPR API search, or for whom a specific rating should be used regardless of API results.

### Override Precedence

The player search algorithm follows this priority order:

1. **Player Registry (cached matches)** - First, check if the player name has been previously matched and cached
2. **Player Overrides** - Check `config/player_overrides.json` for hardcoded ratings
3. **DUPR API Search** - Cascade through multiple search strategies (Alberta, Canada, global)
4. **Default Rating Fallback** - Use `DEFAULT_RATING = 2.5` if player not found

**Key Insight:** Overrides are checked BEFORE any DUPR API calls, but AFTER the player registry cache. This means:
- Overrides take priority over fuzzy matching and API searches
- Previously cached matches (registry) are checked first for performance
- Both the original name AND cleaned name (without guest markers) are checked against overrides

### Override Name Matching

When checking overrides, the system uses case-insensitive matching:

```python
name_key = name.lower().strip()
if name_key in self.config.overrides:
    # Use override
```

The system checks overrides twice:
1. First with the original name (e.g., "John Smith (G)")
2. Then with the cleaned name (e.g., "John Smith") if different

This ensures guest markers like `(G)`, `(g)`, or `(Guest)` don't prevent override matching.

### Storage Format

Overrides are stored in `config/player_overrides.json`:

```json
{
  "overrides": [
    {
      "name": "Player Name",
      "rating": 3.927,
      "reason": "Description of why override exists"
    },
    {
      "name": "Another Player",
      "rating": 4.5,
      "reason": "Player exists on DUPR but not findable via search API"
    }
  ]
}
```

#### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Player's full name (case-insensitive matching) |
| `rating` | number | Yes | DUPR rating to use (range: 2.0 - 8.0) |
| `reason` | string | Yes | Human-readable explanation for the override |

#### PlayerOverride Data Class (Python)

```python
@dataclass
class PlayerOverride:
    name: str
    rating: float
    reason: str
```

### CRUD Operations for Overrides

#### Create (Add Override)

Overrides can be added in two ways:

1. **Manual JSON Editing:** Directly edit `config/player_overrides.json` and add an entry to the `overrides` array.

2. **Automatic via User Setup:** When a user configures their own player info via `userInfo.json`, the system automatically adds them to overrides:

```python
def ensure_user_in_player_overrides(user_info: UserInfo, base_path: Optional[Path] = None) -> None:
    """
    Ensure the user is in player_overrides.json so they can be found during searches.
    """
    # ... loads existing overrides ...

    # Check if user already exists (case-insensitive match)
    user_name_lower = user_info.name.lower().strip()
    for idx, override in enumerate(overrides):
        if override.get("name", "").lower().strip() == user_name_lower:
            existing_idx = idx
            break

    # Create or update override entry
    override_entry = {
        "name": user_info.name,
        "rating": user_info.rating,
        "reason": user_info.reason
    }
```

#### Read (Load Overrides)

Overrides are loaded at application startup via `load_config()`:

```python
def load_config(base_path: Optional[Path] = None) -> Config:
    # ...
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
```

The loaded overrides are stored in a dictionary keyed by lowercase name for O(1) lookup.

#### Update (Modify Override)

Updates are handled by the same mechanism as creates:

1. For manual updates: Edit the JSON file directly
2. For user info updates: The `ensure_user_in_player_overrides()` function detects existing entries and updates them in place:

```python
if existing_idx is not None:
    # Update existing entry
    overrides[existing_idx] = override_entry
else:
    # Add new entry
    overrides.append(override_entry)
```

#### Delete (Remove Override)

**Currently, there is no programmatic delete functionality.** Overrides must be removed by:

1. Manually editing `config/player_overrides.json`
2. Removing the desired entry from the `overrides` array
3. Saving the file

**Mobile App Implementation Note:** The mobile app (Phase 6) should implement a Settings screen with delete functionality:
- List all current overrides
- Allow users to delete individual overrides
- Persist changes to storage

### Override Application in Search

When `PlayerSearcher.search_player()` is called, overrides are checked early in the search sequence:

```python
def search_player(self, full_name: str) -> SearchResult:
    """
    Search for a player using the defined algorithm.

    Search sequence:
    1. Check player registry (cached matches)
    2. Check player_overrides.json (using original and cleaned names)
    3. Full Name + Alberta filter
    4. Last Name + Alberta filter (skip for very common short last names)
    5. Full Name + Canada filter
    6. Last Name + Canada filter
    7. Last Name + No filter
    8. Fallback to default rating
    """

    # Step 1: Check player registry first
    registered = self.player_registry.get(full_name)
    if registered:
        # ... use cached match ...

    # Step 2: Check override with original name
    name_key = self._normalize_name(full_name)
    if name_key in self.config.overrides:
        override = self.config.overrides[name_key]
        return SearchResult(
            name=full_name,
            rating=override.rating,
            player_id=None,
            profile_url=None,
            found=True,
            search_method=f"Override: {override.reason}"
        )

    # Clean the name and check again
    cleaned_name = self._clean_name(full_name)
    cleaned_key = self._normalize_name(cleaned_name)
    if cleaned_key != name_key and cleaned_key in self.config.overrides:
        # ... use override with cleaned name ...

    # Continue with API searches...
```

### Override SearchResult

When an override is used, the `SearchResult` has specific characteristics:

| Field | Value |
|-------|-------|
| `name` | Original search name (not cleaned) |
| `rating` | Override rating value |
| `player_id` | `None` (no API lookup performed) |
| `profile_url` | `None` (no DUPR profile available) |
| `found` | `True` |
| `search_method` | `"Override: {reason}"` |

### Common Override Reasons

Based on the Python implementation, common reasons for overrides include:

- `"Player exists on DUPR but not findable via search API"` - Default reason for user self-registration
- `"Auto-populated from DUPR login"` - User info extracted from authentication
- `"Manual rating entry"` - Administrator-specified rating
- `"API search returns wrong player"` - Disambiguation when multiple players match

### Configuration Files Summary

| File | Purpose | Auto-created |
|------|---------|--------------|
| `config/player_overrides.json` | Hardcoded player ratings | Yes (when user info saved) |
| `config/userInfo.json` | User's own player info | Yes (on first run) |
| `config/dupr_token.txt` | Authentication token | Yes (on login) |

### Override Lookup (Quick Reference)

- Overrides are looked up by normalized name: `name.lower().strip()`
- Case-insensitive matching
- Exact match required (no fuzzy matching for overrides)
- Guest markers are stripped before second lookup attempt

---

## Summary Table

| Format | Input Style | Delimiter | Player Count | Pool Size |
|--------|-------------|-----------|--------------|-----------|
| DUPR Ladder | One per line | None | Any (recommended 100) | 4-5 (variable) |
| Partner DUPR | One team per line | `/` | Any (recommended 50 teams) | 4-5 teams (variable) |
| PickleBros Monday | One per line | None | Multiple of 4 | 4 (fixed) |

---

## Implementation Checklist

When implementing TypeScript parsers, ensure:

- [ ] Whitespace trimming on all names
- [ ] Empty line handling
- [ ] Case-insensitive name lookup
- [ ] Rating validation (2.0 - 8.0)
- [ ] Default rating (2.5) for unfound players
- [ ] Team rating formula: 35% higher + 65% lower
- [ ] Pool distribution algorithm matches Python behavior
- [ ] PickleBros validates multiple-of-4 constraint
- [ ] Override lookup by lowercase normalized name

---

## Player Lookup Behavior

### Overview

The player search algorithm finds DUPR ratings for players using a sophisticated multi-tier cascade search with fuzzy matching, nickname resolution, and location-based filtering. The algorithm prioritizes accuracy while maximizing the chance of finding a match.

### Fuzzy Matching Algorithm

**Algorithm:** Jaro-Winkler similarity (via `rapidfuzz.distance.JaroWinkler`)

**Default Threshold:** `0.85` (85% similarity required for a match)

The Jaro-Winkler algorithm is specifically chosen for name matching because:
- It gives higher scores to strings that match from the beginning
- It handles common typos and character transpositions well
- It is effective for both short names and longer full names

#### Fuzzy Matching Rules

| Scenario | Threshold | Result |
|----------|-----------|--------|
| Exact match | N/A | Always matches |
| High similarity (>= 0.85) | 0.85 | Matches as fuzzy match |
| Auto-selection in non-interactive | 0.95 | Only auto-selects if score >= 0.95 |
| Full name fuzzy search | 0.75 | Used when no first name matches found |

#### Examples

| Search Input | API Result | Jaro-Winkler Score | Match? |
|--------------|------------|-------------------|--------|
| "Jon Smith" | "John Smith" | ~0.96 | Yes (typo tolerance) |
| "Nikolas" | "Nicholas" | ~0.89 | Yes (fuzzy match) |
| "Smith" | "John Smith" | N/A | Yes (last name search, first name filtered) |
| "Smith" | "Jane Smith" | N/A | Yes (returns multiple, disambiguation needed) |
| "Michael" | "Mike" | ~0.73 | No (but nickname resolution catches this) |

### Nickname Resolution

The system maintains a bidirectional mapping of nicknames to formal names stored in `/config/nicknames.json`.

#### Nickname Matching Features

1. **Bidirectional Lookup**
   - `getNicknames(formalName)`: "Nicholas" -> {"nick", "nico"}
   - `getFormalNames(nickname)`: "Nick" -> {"nicholas", "nicolas", "nico"}

2. **Transitive Equivalence**
   - "Nick" is equivalent to "Nicholas"
   - "Nicholas" is equivalent to "Nico"
   - Therefore "Nick" is equivalent to "Nico" (through transitive closure)

3. **Case Insensitivity**
   - All name comparisons are normalized to lowercase

#### Supported Nickname Mappings

```json
{
  "nick": ["nicholas", "nicolas", "nico"],
  "bob": ["robert", "roberto", "rob"],
  "bill": ["william", "will", "billy", "willy"],
  "mike": ["michael", "mikhail", "mick"],
  "jim": ["james", "jimmy", "jamie"],
  "jon": ["jonathan", "john", "johnny"],
  ...
}
```

See `/config/nicknames.json` for the complete list (39 nickname groups).

### First Name Matching Tiers

When comparing a search first name against an API result first name, the following tiers are checked in order:

| Tier | Method | Example |
|------|--------|---------|
| 1 | Substring matching | "Jon" in "Jonathan" -> match |
| 2 | Nickname equivalence | "Nick" == "Nicholas" -> match |
| 3 | Fuzzy matching (threshold 0.85) | "Nikolas" ~ "Nicholas" -> match |

### 8-Tier Cascade Search Order

The player search follows a specific cascade sequence, stopping at the first successful match:

```
Tier 1: Player Registry (cached matches)
    |
    v
Tier 2: Player Overrides (hardcoded ratings)
    |
    v
Tier 3: Full Name + Alberta filter
    |
    v
Tier 4: Last Name + Alberta filter*
    |
    v
Tier 5: Full Name + Canada filter
    |
    v
Tier 6: Last Name + Canada filter*
    |
    v
Tier 7: Last Name + No filter (global)*
    |
    v
Tier 8: Full Name + No filter (global)
    |
    v
Fallback: Default rating (2.5)
```

*Tiers 4, 6, and 7 are skipped for short common last names (see below)

#### Tier Details

| Tier | Query | Location Filter | Lat/Lng | Description |
|------|-------|-----------------|---------|-------------|
| 1 | Registry lookup | N/A | N/A | Check cached name->DUPR ID mappings |
| 2 | Override lookup | N/A | N/A | Check hardcoded player_overrides.json |
| 3 | Full name | Alberta, Canada | 53.9332706, -116.5765035 | Primary search for local players |
| 4 | Last name only | Alberta, Canada | 53.9332706, -116.5765035 | Catches players with different first name spellings |
| 5 | Full name | Canada | 56.130366, -106.346771 | Expands to all of Canada |
| 6 | Last name only | Canada | 56.130366, -106.346771 | Last name search across Canada |
| 7 | Last name only | None | None | Global last name search |
| 8 | Full name | None | None | Last resort global search |
| Fallback | N/A | N/A | N/A | Returns DEFAULT_RATING (2.5) |

#### Location Constants

```typescript
// Alberta filter (primary)
ALBERTA_LAT = 53.9332706
ALBERTA_LNG = -116.5765035
ALBERTA_TEXT = "Alberta, Canada"

// Canada filter (secondary)
CANADA_LAT = 56.130366
CANADA_LNG = -106.346771
CANADA_TEXT = "Canada"
```

### Short Common Last Name Handling

To avoid excessive API results, last-name-only searches (Tiers 4, 6, 7) are skipped for players with short common last names:

```typescript
SHORT_COMMON_LASTNAMES = {
  'ng', 'hu', 'wu', 'li', 'le', 'lu', 'ma', 'xu', 'yu', 'ye', 'he', 'ho',
  'wong', 'chen', 'wang', 'zhang', 'liu', 'yang', 'huang', 'zhao', 'zhou', 'sun'
}
```

For these names, only full name searches are performed to ensure accuracy.

### Match Resolution Algorithm

When multiple candidates are returned from the API:

1. **Single result**: Return immediately
2. **Exact full name match**: Prioritize case-insensitive exact matches
3. **First name matching**: Filter by first name using the 3-tier matching above
4. **Fuzzy full name matching**: Score all candidates and filter by threshold (0.75)
5. **Ambiguous resolution**:
   - **Interactive mode**: Prompt user to select from candidates
   - **Non-interactive mode**: Auto-select only if best score >= 0.95, otherwise return no match

### Name Cleaning

Before searching, names are cleaned by removing:
- Guest markers: `(G)`, `(g)`, `(Guest)`
- Trailing parenthetical content: `John Smith (visiting)` -> `John Smith`

```typescript
// Regex patterns
/\s*\([Gg](uest)?\)\s*/  // Remove guest markers
/\s*\([^)]*\)\s*$/        // Remove trailing parentheticals
```

### Player Registry (Caching)

Successfully matched players are cached in a registry to speed up future lookups:

```typescript
interface RegisteredPlayer {
  searchName: string;    // The name user searched for
  duprId: string;        // DUPR player ID
  duprName: string;      // Canonical DUPR full name
  rating: number | null; // Last known rating
  location: string;      // Player's location
  registeredAt: Date;    // When registered
}
```

**Registry Behavior:**
- Only caches when search name differs from DUPR name (no point caching exact matches)
- On registry hit, fetches fresh rating from API (rating may have changed)
- Falls back to cached rating if API fails

### Search Result Structure

```typescript
interface SearchResult {
  name: string;           // Original search name
  rating: number;         // DUPR rating (or DEFAULT_RATING if not found)
  playerId: number | null;  // DUPR player ID
  profileUrl: string | null; // Link to DUPR profile
  found: boolean;         // Whether player was found
  searchMethod: string;   // How the player was found (for debugging)
}
```

### Key Constants

| Constant | Value | Description |
|----------|-------|-------------|
| DEFAULT_RATING | 2.5 | Rating used when player not found |
| FUZZY_THRESHOLD | 0.85 | Minimum Jaro-Winkler score for fuzzy match |
| AUTO_SELECT_THRESHOLD | 0.95 | Minimum score for auto-selection in non-interactive mode |
| FUZZY_MATCH_THRESHOLD | 0.75 | Threshold for full name fuzzy matching fallback |
| REQUEST_DELAY_MS | 500 | Rate limiting delay between API requests |
| RETRY_COUNT | 3 | Number of API retry attempts |
| RETRY_DELAY_S | 2 | Delay between retries |

### Example Search Scenarios

#### Scenario 1: Exact Match
```
Input: "John Smith"
Tier 3 (Full Name + Alberta): API returns "John Smith" from Edmonton
Result: Found, rating 4.2, method "Full name + Alberta"
```

#### Scenario 2: Typo Tolerance
```
Input: "Jon Smith"
Tier 3 (Full Name + Alberta): API returns "John Smith"
First name match: "Jon" ~ "John" (Jaro-Winkler 0.96 >= 0.85)
Result: Found, rating 4.2, method "Full name + Alberta"
```

#### Scenario 3: Nickname Resolution
```
Input: "Mike Johnson"
Tier 3 (Full Name + Alberta): API returns "Michael Johnson"
First name match: "Mike" == "Michael" (nickname equivalence)
Result: Found, rating 3.8, method "Full name + Alberta"
```

#### Scenario 4: Last Name Search
```
Input: "Alex Thompson"
Tier 3 (Full Name + Alberta): No results
Tier 4 (Last Name + Alberta): API returns "Alexander Thompson"
First name match: "Alex" in "Alexander" (substring)
Result: Found, rating 3.5, method "Last name + Alberta"
```

#### Scenario 5: Not Found
```
Input: "Unknown Player"
Tiers 3-8: No matches found
Result: Not found, rating 2.5 (default), method "Default (player not found)"
```

---

## API Reference

### DUPR Search Endpoint

```
POST https://api.dupr.gg/player/v1.0/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "John Smith",
  "location_text": "Alberta, Canada",
  "lat": 53.9332706,
  "lng": -116.5765035
}
```

### Player Profile URL

```
https://dashboard.dupr.com/dashboard/player/{player_id}
```

---

## P0-SPEC-4: HTML Output Format

**Reference Python Code:** `/src/html_generator.py`

This section documents the HTML output generation, including structure, styling, data fields, and algorithms.

---

### HTML Template Structure

The HTML output uses Bootstrap 5 with custom CSS styling for a modern, responsive design.

#### Document Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{Format Title}</title>
    <!-- Bootstrap 5.3.2 CSS -->
    <!-- Bootstrap Icons 1.11.1 -->
    <!-- Custom CSS (inline) -->
</head>
<body>
    <div class="container py-4">
        <!-- Page Header -->
        <!-- Resolution Summary -->
        <!-- Content (pools/tables) -->
    </div>
    <!-- Bootstrap 5.3.2 JS -->
</body>
</html>
```

#### External Dependencies

| Resource | CDN URL |
|----------|---------|
| Bootstrap CSS | `https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css` |
| Bootstrap Icons | `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css` |
| Bootstrap JS | `https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js` |

---

### CSS Styling

#### Color System (CSS Variables)

```css
:root {
    /* Primary colors */
    --color-primary: #2563eb;
    --color-primary-dark: #1d4ed8;
    --color-success: #059669;
    --color-success-light: #d1fae5;
    --color-warning: #d97706;
    --color-warning-light: #fef3c7;
    --color-muted: #6b7280;
    --color-muted-light: #9ca3af;

    /* Rating tier colors */
    --tier-high: #059669;      /* Green - ratings >= 4.0 */
    --tier-high-bg: #d1fae5;
    --tier-mid: #2563eb;       /* Blue - ratings >= 3.0 */
    --tier-mid-bg: #dbeafe;
    --tier-low: #d97706;       /* Amber - ratings < 3.0 */
    --tier-low-bg: #fef3c7;

    /* Surface colors */
    --surface-card: #ffffff;
    --surface-alt: #f9fafb;
    --border-color: #e5e7eb;
}
```

#### Rating Tier Colors

| Tier | Rating Range | Background | Text Color | CSS Class |
|------|--------------|------------|------------|-----------|
| High | >= 4.0 | `#d1fae5` (light green) | `#059669` (green) | `rating-high` |
| Mid | >= 3.0, < 4.0 | `#dbeafe` (light blue) | `#2563eb` (blue) | `rating-mid` |
| Low | < 3.0 | `#fef3c7` (light amber) | `#d97706` (amber) | `rating-low` |

#### Team Rating Tier Colors (Partner DUPR)

| Tier | Rating Range | Background | Text Color | CSS Class |
|------|--------------|------------|------------|-----------|
| Highest | >= 4.0 | `#dcfce7` | `#166534` | `tier-highest` |
| High | >= 3.5, < 4.0 | `#dbeafe` | `#1e40af` | `tier-high` |
| Mid | >= 3.0, < 3.5 | `#fef3c7` | `#92400e` | `tier-mid` |
| Low | < 3.0 | `#fee2e2` | `#991b1b` | `tier-low` |

#### Typography

- **Font Family:** System fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`)
- **Monospace (ratings):** `'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace`
- **Page Title:** 1.75rem, font-weight 700
- **Section Header:** 1.1rem, font-weight 600
- **Player Name:** 1rem, font-weight 600
- **Rating Badge:** 0.95rem, font-weight 600

#### Print-Friendly Styles

The HTML includes `@media print` styles for clean printing:

- White background
- Black text
- No shadows
- Solid borders (2px black)
- Pool headers get light gray background (`#f0f0f0`)
- Profile link icons hidden
- Page break avoidance for pool cards
- Font size reduced to 10pt

---

### Data Fields Per Format

#### 1. DUPR Ladder Format

**Purpose:** Display individual players sorted by rating into pools.

**Page Header:**
- Title: "DUPR Ladder"
- Subtitle: Current date (format: "Month DD, YYYY")

**Resolution Summary:**
- Total players count
- Resolved players count
- List of unresolved players (using default rating 2.5)

**Pool Card Structure:**

| Field | Description |
|-------|-------------|
| Pool Name | Letter designation (A, B, C, D...) |
| Player Count | Number of players in pool |
| Player Rank | Position within pool (1, 2, 3...) |
| Player Name | Full name with optional DUPR profile link |
| Player Rating | DUPR rating with tier color badge |
| Default Indicator | Badge showing "Default" if player not found |

**Data Classes:**

```typescript
interface PlayerWithRating {
    name: string;           // Player's full name
    rating: number;         // DUPR rating (default: 2.5)
    profileUrl: string | null;  // Link to DUPR profile
    found: boolean;         // Whether player was found in DUPR
    searchMethod: string;   // How the player was found
}

interface PlayerPool {
    name: string;           // Pool letter ("A", "B", "C", "D")
    players: PlayerWithRating[];
}
```

#### 2. Partner DUPR Format

**Purpose:** Display teams (pairs of players) sorted by team rating into pools.

**Page Header:**
- Title: "Partner DUPR"
- Subtitle: Current date
- Stats: Total teams, Total pools, Players resolved ratio

**Resolution Summary:**
- Total players count (all players across all teams)
- Resolved players count
- List of unresolved players

**Pool Card Structure:**

| Field | Description |
|-------|-------------|
| Pool Name | Letter designation (A, B, C, D...) |
| Team Count | Number of teams in pool |
| Team Rank | Position within pool (1, 2, 3...) |
| Player 1 Name | First player's name with profile link |
| Player 2 Name | Second player's name with profile link |
| Individual Ratings | Both players' individual DUPR ratings |
| Team DUPR | Calculated team rating (35%/65% formula) |

**Team Table Columns:**
1. `#` - Team rank within pool
2. `Team` - Both player names
3. `Ind. DUPR` - Individual player ratings
4. `Team` - Calculated team DUPR rating

**Data Classes:**

```typescript
interface TeamWithRatings {
    player1: PlayerWithRating;
    player2: PlayerWithRating;
    teamRating: number;     // Calculated: 35% higher + 65% lower
}

interface Pool {
    name: string;           // Pool letter
    teams: TeamWithRatings[];
    pointsPerGame: number;  // 11 for 4-team pools, 9 for 5-team pools
    courtStart: number;     // First court number
    courtEnd: number;       // Last court number
}
```

**Team Rating Formula:**
```typescript
function calculateTeamRating(rating1: number, rating2: number): number {
    const higher = Math.max(rating1, rating2);
    const lower = Math.min(rating1, rating2);
    return Math.round((0.35 * higher + 0.65 * lower) * 1000) / 1000;
}
```

#### 3. PickleBros Monday Format

**Purpose:** Display players in fixed 4-player pools (player count must be multiple of 4).

**Page Header:**
- Title: "PickleBros Monday"
- Subtitle: Current date + "Fixed 4-Player Pools"

**Resolution Summary:**
- Same as DUPR Ladder format

**Pool Card Structure:**
- Same as DUPR Ladder format
- Each pool always contains exactly 4 players
- Pool meta always shows "(4 players)"

---

### Pool Distribution Algorithms

#### DUPR Ladder Pool Distribution

**Function:** `distributePlayersToPool(players, targetSize = 5, minSize = 4)`

**Algorithm:**

1. Sort players by rating (highest first)
2. Calculate number of pools: `ceil(N / targetSize)`
3. Reduce pool count if it would result in pools smaller than `minSize`
4. Calculate base size and remainder for even distribution
5. **Lower-rated pools get extra players first** (fill from bottom up)

**Distribution Logic:**
```python
# From html_generator.py
num_pools = math.ceil(N / target_size)
while num_pools > 1 and N < num_pools * min_size:
    num_pools -= 1

base_size = N // num_pools
remainder = N % num_pools

for i in range(num_pools):
    # Pools at END (lower rated) get extra players
    if i >= num_pools - remainder:
        pool_size = base_size + 1
    else:
        pool_size = base_size
```

**Examples:**

| Total Players | Pools | Distribution |
|---------------|-------|--------------|
| 18 | 4 | A=4, B=4, C=5, D=5 |
| 9 | 2 | A=4, B=5 |
| 20 | 4 | A=5, B=5, C=5, D=5 |
| 17 | 4 | A=4, B=4, C=4, D=5 |
| 3 | 1 | A=3 (edge case: fewer than minSize) |

**Edge Cases:**
- If `N < minSize`: Single pool with all players
- If reducing pools would still result in pools < minSize, continue reducing

#### PickleBros Pool Distribution

**Function:** `distributePlayersToPicklebrosPools(players)`

**Algorithm:**

1. Sort players by rating (highest first)
2. Calculate number of pools: `N / 4` (integer division)
3. Each pool gets exactly 4 players

**Constraint:** Player count must be a multiple of 4 (validated before calling)

**Examples:**

| Total Players | Pools | Distribution |
|---------------|-------|--------------|
| 8 | 2 | A=4, B=4 |
| 12 | 3 | A=4, B=4, C=4 |
| 16 | 4 | A=4, B=4, C=4, D=4 |

#### Partner DUPR Pool Distribution

**Function:** `distributeTeamsToPool(teams, targetSize = 5, minSize = 4)`

**Algorithm:**

1. Sort teams by team rating (highest first)
2. Calculate number of pools using ceiling division
3. Ensure at least one pool
4. Reduce pool count if average would be below minSize
5. **Higher-rated pools get extra teams first** (opposite of ladder)
6. Assign court numbers and points per game

**Distribution Logic:**
```python
# From html_generator.py
# Extra team goes to earlier (higher-rated) pools
pool_size = base_size + (1 if i < remainder else 0)
```

**Points Per Game by Pool Size:**
- 4-team pool: 11 points
- 5-team pool: 9 points

**Court Assignment:**
- 2 courts per pool (configurable via `COURTS_PER_POOL`)
- Sequential numbering starting from court 1

---

### Resolution Summary Component

The resolution summary appears on all formats and shows:

1. **Success state** (green left border, `summary-success` class):
   - Icon: `bi-check-circle-fill text-success`
   - Message: "Players resolved: X/X"

2. **Warning state** (amber left border, `summary-warning` class):
   - Icon: `bi-exclamation-triangle-fill text-warning`
   - Message: "Players resolved: X/Y"
   - Unresolved list with amber background (`#fffbeb`)
   - Lists players using default rating (2.5)

---

### Profile Links

When a player is found in DUPR, their profile URL is generated:

```
https://dashboard.dupr.com/dashboard/player/{player_id}
```

The link is displayed as a small arrow icon next to the player name:
- Icon: `bi-box-arrow-up-right`
- Opens in new tab (`target="_blank"`)
- Hidden in print view

---

### Responsive Design

The layout adapts to different screen sizes:

| Breakpoint | Pools Layout |
|------------|--------------|
| < 768px | Single column, stacked elements |
| 768px - 991px | 2 columns |
| >= 992px | 3-4 columns depending on pool count |

**Pool Count to Column Mapping:**
- 1 pool: `col-12` (full width)
- 2 pools: `col-12 col-md-6` (2 columns on medium+)
- 3 pools: `col-12 col-md-6 col-lg-4` (3 columns on large)
- 4+ pools: `col-12 col-md-6` (2x2 grid)

---

### Pool Header Styling

Each pool has a distinct gradient header color:

| Pool | Gradient Start | Gradient End | CSS Class |
|------|----------------|--------------|-----------|
| A | `#059669` | `#047857` | `pool-a` |
| B | `#2563eb` | `#1d4ed8` | `pool-b` |
| C | `#7c3aed` | `#6d28d9` | `pool-c` |
| D | `#db2777` | `#be185d` | `pool-d` |
| E+ | `#6b7280` | `#4b5563` | `pool-default` |

---

### HTML Output Constants Reference

From `/src/config.py`:

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_RATING` | 2.5 | Rating for unfound players |
| `POOL_TARGET_SIZE` | 5 | Preferred players/teams per pool |
| `POOL_MIN_SIZE` | 4 | Minimum players/teams per pool |
| `COURTS_PER_POOL` | 2 | Courts assigned per pool |
| `POOL_POINTS[4]` | 11 | Points per game for 4-team pools |
| `POOL_POINTS[5]` | 9 | Points per game for 5-team pools |

---

### P0-SPEC-4 Acceptance Criteria Verification

- [x] **HTML template documented** - Complete document structure, Bootstrap dependencies, and CSS variables documented
- [x] **All fields per format listed** - DUPR Ladder, Partner DUPR, and PickleBros Monday formats fully specified with all data fields
- [x] **Rating tier colors documented**:
  - Green (high): >= 4.0
  - Blue (mid): >= 3.0
  - Amber (low): < 3.0
- [x] **Pool distribution algorithm documented** - Including target size 5, min size 4, and fill-from-bottom logic for ladder format

---

*Document Version: 1.3*
*Last Updated: 2026-02-01*
*Source: Python implementation in `/src/game_types.py`, `/src/config.py`, `/src/html_generator.py`, `/src/player_search.py`, `/src/nickname_resolver.py`*
*Tasks: P0-SPEC-1 (Input Validation), P0-SPEC-2 (Player Lookup Behavior), P0-SPEC-3 (Override Behavior), P0-SPEC-4 (HTML Output Format)*
