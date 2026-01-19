"""Playwright tests for HTML output verification."""

import pytest
from pathlib import Path
from tempfile import TemporaryDirectory

from playwright.sync_api import Page, expect

from src.html_generator import (
    PlayerWithRating,
    TeamWithRatings,
    generate_dupr_ladder_html,
    generate_partner_dupr_html
)


def make_player(name: str, rating: float, found: bool = True) -> PlayerWithRating:
    """Helper to create test players."""
    return PlayerWithRating(
        name=name,
        rating=rating,
        profile_url=f"https://dashboard.dupr.com/dashboard/player/123" if found else None,
        found=found,
        search_method="Test search"
    )


@pytest.fixture
def temp_html_dir():
    """Create a temporary directory for HTML files."""
    with TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


class TestDUPRLadderHTML:
    """Playwright tests for DUPR Ladder HTML output."""

    def test_renders_page_title(self, page: Page, temp_html_dir: Path):
        """Test that page has correct title."""
        players = [make_player("John Doe", 4.0)]
        html_path = temp_html_dir / "ladder.html"
        generate_dupr_ladder_html(players, html_path)

        page.goto(f"file://{html_path}")
        expect(page).to_have_title("DUPR Ladder Rankings")

    def test_displays_player_name(self, page: Page, temp_html_dir: Path):
        """Test that player names are displayed."""
        players = [make_player("John Doe", 4.0)]
        html_path = temp_html_dir / "ladder.html"
        generate_dupr_ladder_html(players, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("John Doe")).to_be_visible()

    def test_displays_rating_badge(self, page: Page, temp_html_dir: Path):
        """Test that rating badges are displayed."""
        players = [make_player("John Doe", 4.12)]
        html_path = temp_html_dir / "ladder.html"
        generate_dupr_ladder_html(players, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("4.12")).to_be_visible()

    def test_displays_ranking_numbers(self, page: Page, temp_html_dir: Path):
        """Test that ranking numbers are displayed."""
        players = [
            make_player("First", 4.0),
            make_player("Second", 3.0)
        ]
        html_path = temp_html_dir / "ladder.html"
        generate_dupr_ladder_html(players, html_path)

        page.goto(f"file://{html_path}")
        expect(page.locator(".rank-badge").first).to_be_visible()

    def test_player_links_are_clickable(self, page: Page, temp_html_dir: Path):
        """Test that player profile links are present and clickable."""
        players = [make_player("John Doe", 4.0, found=True)]
        html_path = temp_html_dir / "ladder.html"
        generate_dupr_ladder_html(players, html_path)

        page.goto(f"file://{html_path}")
        link = page.locator(".profile-link").first
        expect(link).to_be_visible()
        expect(link).to_have_attribute("href", "https://dashboard.dupr.com/dashboard/player/123")

    def test_resolution_summary_visible(self, page: Page, temp_html_dir: Path):
        """Test that resolution summary is visible."""
        players = [
            make_player("Found", 4.0, found=True),
            make_player("Not Found", 2.5, found=False)
        ]
        html_path = temp_html_dir / "ladder.html"
        generate_dupr_ladder_html(players, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("1/2")).to_be_visible()


class TestPartnerDUPRHTML:
    """Playwright tests for Partner DUPR HTML output."""

    def test_renders_page_title(self, page: Page, temp_html_dir: Path):
        """Test that page has correct title."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.675
        )]
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page).to_have_title("Partner DUPR")

    def test_displays_pool_header(self, page: Page, temp_html_dir: Path):
        """Test that pool headers are displayed."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.675
        )]
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("POOL A")).to_be_visible()

    def test_displays_both_players(self, page: Page, temp_html_dir: Path):
        """Test that both team players are displayed."""
        teams = [TeamWithRatings(
            player1=make_player("John Doe", 4.0),
            player2=make_player("Jane Smith", 3.5),
            team_rating=3.675
        )]
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("John Doe")).to_be_visible()
        expect(page.get_by_text("Jane Smith")).to_be_visible()

    def test_displays_team_rating(self, page: Page, temp_html_dir: Path):
        """Test that team combined rating is displayed."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.68
        )]
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page.locator(".team-dupr").first).to_be_visible()
        expect(page.get_by_text("3.68")).to_be_visible()

    def test_displays_individual_ratings(self, page: Page, temp_html_dir: Path):
        """Test that individual ratings are displayed."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.12),
            player2=make_player("Jane", 3.45),
            team_rating=3.68
        )]
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("4.12")).to_be_visible()
        expect(page.get_by_text("3.45")).to_be_visible()

    def test_both_player_links_present(self, page: Page, temp_html_dir: Path):
        """Test that both players have profile links."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0, found=True),
            player2=make_player("Jane", 3.5, found=True),
            team_rating=3.675
        )]
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        links = page.locator(".profile-link")
        expect(links.nth(0)).to_be_visible()
        expect(links.nth(1)).to_be_visible()

    def test_pool_metadata_displayed(self, page: Page, temp_html_dir: Path):
        """Test that pool metadata (team count) is displayed."""
        # Create 5 teams to ensure we get a pool with 5 teams
        teams = []
        for i in range(5):
            teams.append(TeamWithRatings(
                player1=make_player(f"P{i}A", 4.0 - i * 0.1),
                player2=make_player(f"P{i}B", 3.5 - i * 0.1),
                team_rating=3.7 - i * 0.1
            ))
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("5 Teams")).to_be_visible()

    def test_multiple_pools_rendered(self, page: Page, temp_html_dir: Path):
        """Test that multiple pools are rendered for 10+ teams."""
        teams = []
        for i in range(10):
            teams.append(TeamWithRatings(
                player1=make_player(f"P{i}A", 4.0 - i * 0.05),
                player2=make_player(f"P{i}B", 3.5 - i * 0.05),
                team_rating=3.7 - i * 0.05
            ))
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("POOL A")).to_be_visible()
        expect(page.get_by_text("POOL B")).to_be_visible()

    def test_team_ranking_within_pool(self, page: Page, temp_html_dir: Path):
        """Test that team ranking numbers are displayed within pool."""
        teams = []
        for i in range(5):
            teams.append(TeamWithRatings(
                player1=make_player(f"P{i}A", 4.0 - i * 0.1),
                player2=make_player(f"P{i}B", 3.5 - i * 0.1),
                team_rating=3.7 - i * 0.1
            ))
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        # Should have team ranks 1-5 in the pool
        expect(page.locator(".team-rank").first).to_contain_text("1")

    def test_pool_card_structure(self, page: Page, temp_html_dir: Path):
        """Test that pool cards have correct structure."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.675
        )]
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        # Check for pool card structure
        expect(page.locator(".pool-card").first).to_be_visible()
        expect(page.locator(".pool-header").first).to_be_visible()
        expect(page.locator(".team-table").first).to_be_visible()

    def test_header_stats_displayed(self, page: Page, temp_html_dir: Path):
        """Test that header stats (teams, pools, resolved) are displayed."""
        teams = []
        for i in range(15):
            teams.append(TeamWithRatings(
                player1=make_player(f"P{i}A", 4.0 - i * 0.05),
                player2=make_player(f"P{i}B", 3.5 - i * 0.05),
                team_rating=3.7 - i * 0.05
            ))
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("15 Teams")).to_be_visible()
        expect(page.get_by_text("3 Pools")).to_be_visible()

    def test_resolution_summary_in_header(self, page: Page, temp_html_dir: Path):
        """Test that resolution summary is in header."""
        teams = [TeamWithRatings(
            player1=make_player("Found", 4.0, found=True),
            player2=make_player("NotFound", 2.5, found=False),
            team_rating=3.0
        )]
        html_path = temp_html_dir / "partner.html"
        generate_partner_dupr_html(teams, html_path)

        page.goto(f"file://{html_path}")
        expect(page.get_by_text("1/2 players resolved")).to_be_visible()
