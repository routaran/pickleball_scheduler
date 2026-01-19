# How to Use DUPR Pickleball Scheduler

This guide walks you through using the DUPR Pickleball Scheduler to look up player ratings and generate tournament/ladder reports.

---

## Table of Contents

1. [Starting the Application](#starting-the-application)
2. [Logging In to DUPR](#logging-in-to-dupr)
3. [Game Types Explained](#game-types-explained)
4. [DUPR Ladder Mode](#dupr-ladder-mode)
5. [Partner DUPR Mode](#partner-dupr-mode)
6. [Understanding the Output](#understanding-the-output)
7. [Adding Player Overrides](#adding-player-overrides)
8. [Tips and Best Practices](#tips-and-best-practices)

---

## Starting the Application

### Method 1: Desktop Shortcut (Recommended)

1. Find the **"DUPR Pickleball Scheduler"** icon on your Desktop
2. **Double-click** to launch

### Method 2: From Installation Folder

1. Open the installation folder (default: `C:\Users\YourName\PickleballScheduler`)
2. **Double-click** `dupr-lookup.bat`

### Method 3: Command Line

For advanced users who want to specify options:

```
cd C:\Users\YourName\PickleballScheduler
dupr-lookup.bat
```

Or with a specific game type:
```
dupr-lookup.bat ladder
dupr-lookup.bat partner
```

---

## Logging In to DUPR

### First Time Login

1. When you first run the application, you'll see:
   ```
   No DUPR token found. Opening login window...
   Please log in to DUPR in the browser window...
   ```

2. A browser window will open to the DUPR login page

3. Enter your DUPR email and password

4. Click **Log In**

5. Once logged in, the browser window closes automatically

6. You'll see a confirmation:
   ```
   Successfully authenticated with DUPR!
     Welcome, Your Name!
     Doubles: 3.927
   ```

### Session Expiration

Your login session lasts for several days. When it expires:

1. You'll see: `Token expired. Opening login window to refresh...`
2. Log in again in the browser window
3. Continue with your task

---

## Game Types Explained

### DUPR Ladder

- For **individual player** competitions
- Each player is looked up and rated separately
- Output shows players sorted by their DUPR rating (highest first)
- Great for: Round robins, skill-based groupings, ladder rankings

### Partner DUPR

- For **doubles teams** (2 players per team)
- Teams are looked up and given a combined rating
- Team rating = average of both players' ratings
- Output shows teams sorted by combined rating (highest first)
- Great for: Partner tournaments, doubles round robins

---

## DUPR Ladder Mode

### Step 1: Start the Application

Double-click the Desktop shortcut or run `dupr-lookup.bat`

### Step 2: Select Game Type

When prompted:
```
Select game type:
  1. DUPR Ladder
  2. Partner DUPR
Enter choice (1 or 2):
```

Type `1` and press **Enter**

### Step 3: Enter Player Names

You'll see:
```
Paste player names (one per line).
Press Enter twice when done:
```

**Copy your player list** from your signup sheet (Excel, Google Sheets, email, etc.) and **paste** it into the window.

**Example input:**
```
John Smith
Jane Doe
Bob Johnson
Alice Williams
```

Press **Enter** twice when done.

### Step 4: Wait for Lookups

The application will search for each player:
```
Processing DUPR Ladder with 4 players
  [1/4] Looking up: John Smith
    ✓ Rating: 4.125
  [2/4] Looking up: Jane Doe
    ✓ Rating: 3.875
  [3/4] Looking up: Bob Johnson
    ? (default rating) Rating: 2.500
  [4/4] Looking up: Alice Williams
    ✓ Rating: 3.650
```

- ✓ means the player was found in DUPR
- ? means the player wasn't found (assigned default rating 2.5)

### Step 5: View Results

The HTML report opens automatically in your browser, showing:
- Players sorted by rating (highest first)
- Each player's name and DUPR rating
- Links to their DUPR profiles

The file is also saved to: `output/dupr_ladder.html`

---

## Partner DUPR Mode

### Step 1: Start and Select Partner DUPR

1. Run the application
2. Type `2` and press **Enter** for Partner DUPR

### Step 2: Enter Team Information

You can enter teams in two formats:

#### Format A: Pre-formed Teams (Recommended)

If you already know who's partnered with whom:
```
John Smith / Jane Doe
Bob Johnson / Alice Williams
Mike Brown / Sarah Davis
```

Use a **forward slash (/)** to separate partners.

#### Format B: Player List (Auto-Pairing)

If you just have a list of names, enter them in order:
```
John Smith
Jane Doe
Bob Johnson
Alice Williams
Mike Brown
Sarah Davis
```

Players will be paired in order:
- Team 1: John Smith + Jane Doe
- Team 2: Bob Johnson + Alice Williams
- Team 3: Mike Brown + Sarah Davis

**Note:** If you have an odd number of players, the last one will be excluded with a warning.

### Step 3: Wait for Lookups

Each unique player is looked up once:
```
Processing Partner DUPR with 3 teams
  [1/6] Looking up: Alice Williams
    ✓ Rating: 3.650
  [2/6] Looking up: Bob Johnson
    ? (default rating) Rating: 2.500
  ...
```

### Step 4: View Results

The HTML report shows:
- Teams sorted by combined rating (highest first)
- Both players' names and individual ratings
- Team combined rating (average of both)
- Links to DUPR profiles

File saved to: `output/partner_dupr.html`

---

## Understanding the Output

### HTML Report Features

The generated HTML reports include:

1. **Sorted list** - Players/teams are sorted by rating (highest first)
2. **Rating display** - Shows DUPR rating for each player
3. **Profile links** - Click a name to view their DUPR profile
4. **Visual indicators** - Found vs not-found players are styled differently
5. **Print-friendly** - Can be printed directly from browser

### Rating Colors

- **Found players** - Shown with verified rating
- **Not found players** - Shown with default 2.5 rating and visual indicator

### File Locations

Output files are saved in the `output` folder:
- `output/dupr_ladder.html` - DUPR Ladder results
- `output/partner_dupr.html` - Partner DUPR results

---

## Adding Player Overrides

If a player can't be found via DUPR search (common for new players or those with privacy settings), you can add them manually.

### Step 1: Open the Override File

Navigate to: `config/player_overrides.json`

Open it with Notepad or any text editor.

### Step 2: Add Player Entry

The file looks like this:
```json
{
  "overrides": [
    {
      "name": "John Smith",
      "rating": 3.5,
      "reason": "New player, rating from previous club"
    }
  ]
}
```

To add more players:
```json
{
  "overrides": [
    {
      "name": "John Smith",
      "rating": 3.5,
      "reason": "New player, rating from previous club"
    },
    {
      "name": "Jane Doe",
      "rating": 4.0,
      "reason": "DUPR profile is private"
    }
  ]
}
```

**Important:**
- Names must match exactly how they're entered in your player list
- Ratings should be between 2.0 and 8.0
- Don't forget commas between entries (but not after the last one)

### Step 3: Save and Run

Save the file and run the application again. The override ratings will be used instead of searching DUPR.

---

## Tips and Best Practices

### Getting Clean Player Names

1. **From Excel/Google Sheets:**
   - Select the column with names
   - Copy (Ctrl+C)
   - Paste into the application

2. **From Email Lists:**
   - Copy the names
   - The app handles minor formatting differences

3. **Name Matching:**
   - Names should match DUPR profiles
   - "Bob Smith" won't match "Robert Smith"
   - Check DUPR for exact name spelling

### Handling Large Groups

- The app can handle 50+ players
- Each lookup takes about 0.5 seconds
- Be patient for large groups

### Re-running with Same Players

- Output files are overwritten each time
- Save/rename old outputs if you need to keep them

### Printing Reports

1. Open the HTML file in your browser
2. Press Ctrl+P to print
3. The report is designed to print cleanly

### Sharing Results

- Email the HTML file to others
- They can open it in any web browser
- No special software needed to view

---

## Command Line Options

For advanced users:

```
# Interactive mode (prompts for everything)
python -m src.main

# Specify game type directly
python -m src.main ladder
python -m src.main partner

# Use a file instead of pasting
python -m src.main --file players.txt --type ladder

# Specify output location
python -m src.main --file players.txt --type ladder --output results.html

# Enable debug output
python -m src.main --debug
```

---

## Frequently Asked Questions

### Q: Why wasn't a player found?

Possible reasons:
- Name spelling doesn't match DUPR profile
- Player hasn't created a DUPR account
- Player's profile is set to private
- Player is very new to DUPR

**Solution:** Add them to `player_overrides.json` with their rating.

### Q: Can I look up players from other regions?

Yes! The app searches all of DUPR. Location doesn't matter.

### Q: How accurate are the ratings?

Ratings come directly from DUPR's official database. They're as accurate as DUPR itself.

### Q: Can I use this for mixed doubles?

Yes! Use Partner DUPR mode. The app doesn't distinguish between men's, women's, or mixed.

### Q: Is my DUPR login stored securely?

Your login token is stored locally in `config/dupr_token.txt`. It's not uploaded anywhere. The token expires after several days for security.

---

## Getting Help

If you run into issues:

1. Check the [Troubleshooting section in README](README.md#troubleshooting)
2. Open an issue on [GitHub](https://github.com/routaran/pickleball_scheduler/issues)

Include:
- What you were trying to do
- The exact error message
- Your Windows version
