# DUPR Pickleball Scheduler

A tool for pickleball coordinators to quickly look up DUPR ratings for players and generate formatted HTML reports for tournaments and ladder play.

## What This Tool Does

- **Looks up DUPR ratings** for a list of players automatically
- **Generates HTML reports** with player ratings sorted and formatted for easy viewing
- **Supports two game formats:**
  - **DUPR Ladder** - Individual players sorted by rating
  - **Partner DUPR** - Teams of two with combined team ratings
- **Opens results in your browser** automatically when complete

## Requirements

- **Windows 10 or Windows 11**
- **A DUPR account** (free at [dupr.com](https://www.dupr.com))
- **Python 3.9 or higher** (installation instructions below)

---

## Installation (Windows)

### Step 1: Install Python (if you don't have it)

If you already have Python installed, skip to Step 2.

#### Option A: Install from Microsoft Store (Easiest - No Admin Required)

1. Click the **Start** button
2. Type **Microsoft Store** and open it
3. Search for **Python 3.12**
4. Click **Get** to install
5. Wait for installation to complete

#### Option B: Install from python.org

1. Go to [python.org/downloads](https://www.python.org/downloads/)
2. Click the yellow **Download Python 3.x.x** button
3. Run the downloaded installer
4. **IMPORTANT:** Check the box that says **"Add Python to PATH"**
5. Click **Install Now** (or "Install just for me" if you don't have admin rights)

#### Verify Python is Installed

1. Press `Windows + R` to open the Run dialog
2. Type `cmd` and press Enter
3. In the black window that opens, type: `python --version`
4. You should see something like `Python 3.12.0`

If you see an error, restart your computer and try again.

---

### Step 2: Install the DUPR Pickleball Scheduler

#### Quick Install (Recommended)

1. **Download the installer:**
   - Go to: [https://github.com/routaran/pickleball_scheduler/releases](https://github.com/routaran/pickleball_scheduler/releases)
   - Download `Install-Windows.bat`

2. **Run the installer:**
   - Find the downloaded `Install-Windows.bat` file
   - **Double-click** it to run
   - If Windows shows a security warning, click **"More info"** then **"Run anyway"**

3. **Follow the on-screen instructions:**
   - The installer will download and set up everything automatically
   - A browser window will NOT open during installation
   - When complete, you'll see "Installation Complete!"

4. **You're done!**
   - A shortcut called **"DUPR Pickleball Scheduler"** will appear on your Desktop

#### Alternative: Manual Installation

If the quick install doesn't work, you can install manually:

1. **Download the code:**
   - Go to [https://github.com/routaran/pickleball_scheduler](https://github.com/routaran/pickleball_scheduler)
   - Click the green **Code** button
   - Click **Download ZIP**
   - Extract the ZIP file to a folder (e.g., `C:\Users\YourName\PickleballScheduler`)

2. **Open Command Prompt in that folder:**
   - Open the extracted folder in File Explorer
   - Click in the address bar, type `cmd`, and press Enter

3. **Run these commands one at a time:**
   ```
   python -m venv .venv
   .venv\Scripts\activate
   pip install -e .
   playwright install chromium
   ```

4. **Create a shortcut:**
   - Right-click on your Desktop
   - Select **New > Shortcut**
   - For the location, enter: `cmd /k "cd /d C:\Users\YourName\PickleballScheduler && .venv\Scripts\activate && python -m src.main"`
   - Name it "DUPR Pickleball Scheduler"

---

## First Time Setup

The first time you run the application:

1. **Double-click** the "DUPR Pickleball Scheduler" shortcut on your Desktop
2. A **browser window** will automatically open to the DUPR login page
3. **Log in** with your DUPR username and password
4. After successful login, the browser window will **close automatically**
5. You'll see a welcome message with your name and rating
6. Your login is saved - you won't need to log in again unless your session expires

---

## How to Use

For detailed usage instructions, see the **[How-To Guide](How-To.md)**.

### Quick Start

1. **Run the application** by double-clicking the Desktop shortcut
2. **Choose the game type:**
   - Press `1` for DUPR Ladder (individual players)
   - Press `2` for Partner DUPR (teams of two)
3. **Paste your player list** from your signup sheet
4. **Press Enter twice** when done pasting
5. **View results** - they'll open automatically in your browser

---

## Troubleshooting

### "Python is not recognized"
- Make sure you checked "Add Python to PATH" during installation
- Restart your computer and try again
- Reinstall Python using the instructions above

### "Browser won't open for login"
- Make sure you have an internet connection
- Try running as Administrator (right-click > Run as administrator)
- Check if your antivirus is blocking the application

### "Token expired" error
- Your DUPR login session has expired
- The app will automatically open a browser window to log in again
- Log in and try your command again

### "Player not found" warnings
- Some players may not be in the DUPR system
- Players not found will be assigned a default rating of 2.5
- You can add manual overrides in `config/player_overrides.json`

### Need more help?
- Open an issue at [GitHub Issues](https://github.com/routaran/pickleball_scheduler/issues)

---

## Uninstalling

To remove the application:

1. Delete the installation folder:
   - Default location: `C:\Users\YourName\PickleballScheduler`
2. Delete the Desktop shortcut

That's it! No registry entries or system files to clean up.

---

## For Developers

### Running from Source

```bash
git clone https://github.com/routaran/pickleball_scheduler.git
cd pickleball_scheduler
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
playwright install chromium
python -m src.main
```

### Running Tests

```bash
pip install -e ".[dev]"
pytest
```

---

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please open an issue or pull request on GitHub.
