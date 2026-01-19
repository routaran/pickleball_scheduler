"""Tests for HTML generator module."""

import pytest
from pathlib import Path
from tempfile import NamedTemporaryFile

from src.html_generator import (
    PlayerWithRating,
    TeamWithRatings,
    Pool,
    generate_dupr_ladder_html,
    generate_partner_dupr_html,
    distribute_teams_to_pools,
    _get_rating_tier
)


def make_player(name: str, rating: float, found: bool = True) -> PlayerWithRating:
    """Helper to create test players."""
    return PlayerWithRating(
        name=name,
        rating=rating,
        profile_url=f"https://dashboard.dupr.com/player/123" if found else None,
        found=found,
        search_method="Test search"
    )


class TestGetRatingTier:
    """Tests for rating tier classification."""

    def test_high_tier(self):
        """Test that ratings >= 4.0 are high tier."""
        assert _get_rating_tier(4.0) == "high"
        assert _get_rating_tier(4.5) == "high"

    def test_mid_tier(self):
        """Test that ratings 3.0-3.99 are mid tier."""
        assert _get_rating_tier(3.0) == "mid"
        assert _get_rating_tier(3.5) == "mid"
        assert _get_rating_tier(3.99) == "mid"

    def test_low_tier(self):
        """Test that ratings < 3.0 are low tier."""
        assert _get_rating_tier(2.5) == "low"
        assert _get_rating_tier(2.99) == "low"


class TestGenerateDUPRLadderHTML:
    """Tests for DUPR Ladder HTML generation."""

    def test_generates_valid_html5(self):
        """Test that output is valid HTML5."""
        players = [make_player("John Doe", 4.0), make_player("Jane Smith", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert "<!DOCTYPE html>" in html
        assert "<html" in html
        assert "</html>" in html

    def test_includes_bootstrap(self):
        """Test that Bootstrap CSS is included."""
        players = [make_player("John Doe", 4.0), make_player("Jane Smith", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert "bootstrap" in html.lower()

    def test_players_sorted_by_rating_descending(self):
        """Test that players are sorted highest to lowest."""
        players = [
            make_player("Low Player", 2.5),
            make_player("High Player", 4.5),
            make_player("Mid Player", 3.5)
        ]
        html = generate_dupr_ladder_html(players)

        # High player should appear before mid player
        high_pos = html.find("High Player")
        mid_pos = html.find("Mid Player")
        low_pos = html.find("Low Player")

        assert high_pos < mid_pos < low_pos

    def test_displays_rank_numbers(self):
        """Test that ranking numbers are displayed."""
        players = [make_player("John Doe", 4.0), make_player("Jane Smith", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert ">1<" in html  # rank badge

    def test_displays_player_ratings(self):
        """Test that player ratings are displayed."""
        players = [make_player("John Doe", 4.12), make_player("Jane Smith", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert "4.12" in html

    def test_includes_profile_links(self):
        """Test that player profile links are included."""
        players = [make_player("John Doe", 4.0, found=True), make_player("Jane Smith", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert 'href="https://dashboard.dupr.com' in html

    def test_shows_resolution_summary(self):
        """Test that resolution summary is displayed."""
        players = [
            make_player("Found Player", 4.0, found=True),
            make_player("Not Found", 2.5, found=False)
        ]
        html = generate_dupr_ladder_html(players)

        assert "1/2" in html  # 1 of 2 resolved

    def test_marks_unresolved_players(self):
        """Test that unresolved players are marked."""
        players = [make_player("Not Found", 2.5, found=False), make_player("Found", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert "Default" in html
        assert "Not Found" in html

    def test_writes_to_file(self):
        """Test that output can be written to file."""
        players = [make_player("John Doe", 4.0), make_player("Jane Smith", 3.5)]

        with NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            output_path = Path(f.name)

        generate_dupr_ladder_html(players, output_path)

        assert output_path.exists()
        content = output_path.read_text()
        assert "John Doe" in content

    def test_two_tier_layout(self):
        """Test that the two-tier layout is generated."""
        players = [
            make_player("High Player", 4.0),
            make_player("Low Player", 2.5)
        ]
        html = generate_dupr_ladder_html(players)

        # Check for tier headers
        assert "Rating 3.0+" in html
        assert "Rating Below 3.0" in html

    def test_tier_player_counts(self):
        """Test that tier headers show player counts."""
        players = [
            make_player("High1", 4.0),
            make_player("High2", 3.5),
            make_player("Low1", 2.5)
        ]
        html = generate_dupr_ladder_html(players)

        assert "(2 players)" in html  # High tier
        assert "(1 players)" in html  # Low tier

    def test_single_tier_full_width(self):
        """Test that single tier takes full width."""
        # All players >= 3.0
        players = [
            make_player("High1", 4.0),
            make_player("High2", 3.5)
        ]
        html = generate_dupr_ladder_html(players)

        assert "Rating 3.0+" in html
        assert "Rating Below 3.0" not in html

    def test_rating_tier_colors(self):
        """Test that rating badges have tier-specific classes."""
        players = [
            make_player("High", 4.5),
            make_player("Mid", 3.5),
            make_player("Low", 2.5)
        ]
        html = generate_dupr_ladder_html(players)

        assert "rating-high" in html
        assert "rating-mid" in html
        assert "rating-low" in html


class TestGeneratePartnerDUPRHTML:
    """Tests for Partner DUPR HTML generation."""

    def test_generates_valid_html5(self):
        """Test that output is valid HTML5."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.675
        )]
        html = generate_partner_dupr_html(teams)

        assert "<!DOCTYPE html>" in html
        assert "<html" in html

    def test_teams_sorted_by_team_rating(self):
        """Test that teams are sorted by team rating descending."""
        teams = [
            TeamWithRatings(
                player1=make_player("Low1", 2.5),
                player2=make_player("Low2", 2.5),
                team_rating=2.5
            ),
            TeamWithRatings(
                player1=make_player("High1", 4.5),
                player2=make_player("High2", 4.0),
                team_rating=4.175
            )
        ]
        html = generate_partner_dupr_html(teams)

        high_pos = html.find("High1")
        low_pos = html.find("Low1")
        assert high_pos < low_pos

    def test_displays_team_rating(self):
        """Test that team combined rating is displayed."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.67
        )]
        html = generate_partner_dupr_html(teams)

        assert "3.67" in html

    def test_displays_both_player_ratings(self):
        """Test that both player ratings are displayed."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.12),
            player2=make_player("Jane", 3.45),
            team_rating=3.689
        )]
        html = generate_partner_dupr_html(teams)

        assert "4.12" in html
        assert "3.45" in html

    def test_displays_pool_labels(self):
        """Test that pool labels are displayed."""
        teams = [
            TeamWithRatings(
                player1=make_player("John", 4.0),
                player2=make_player("Jane", 3.5),
                team_rating=3.675
            ),
            TeamWithRatings(
                player1=make_player("Bob", 3.5),
                player2=make_player("Alice", 3.0),
                team_rating=3.175
            )
        ]
        html = generate_partner_dupr_html(teams)

        # With 2 teams, they should be in 1 pool
        assert "POOL A" in html

    def test_displays_team_header(self):
        """Test that Team column header is shown."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.675
        )]
        html = generate_partner_dupr_html(teams)

        # Check for team table structure
        assert "team-table" in html
        assert "team-dupr" in html

    def test_includes_profile_links_for_both(self):
        """Test that both players have profile links."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0, found=True),
            player2=make_player("Jane", 3.5, found=True),
            team_rating=3.675
        )]
        html = generate_partner_dupr_html(teams)

        # Count occurrences of the profile link
        assert html.count('href="https://dashboard.dupr.com') >= 2

    def test_resolution_summary_counts_all_players(self):
        """Test that resolution summary counts individual players."""
        teams = [
            TeamWithRatings(
                player1=make_player("Found1", 4.0, found=True),
                player2=make_player("NotFound1", 2.5, found=False),
                team_rating=3.025
            ),
            TeamWithRatings(
                player1=make_player("Found2", 3.5, found=True),
                player2=make_player("Found3", 3.0, found=True),
                team_rating=3.175
            )
        ]
        html = generate_partner_dupr_html(teams)

        # 3 of 4 players resolved
        assert "3/4" in html

    def test_marks_unresolved_players_in_summary(self):
        """Test that unresolved players are shown in summary."""
        teams = [TeamWithRatings(
            player1=make_player("Found", 4.0, found=True),
            player2=make_player("NotFound", 2.5, found=False),
            team_rating=3.025
        )]
        html = generate_partner_dupr_html(teams)

        # Unresolved players should be shown in the summary
        assert "NotFound" in html
        assert "Using default rating" in html

    def test_pool_card_structure(self):
        """Test that pool cards have proper structure."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.675
        )]
        html = generate_partner_dupr_html(teams)

        assert "pool-card" in html
        assert "pool-header" in html
        assert "team-row" in html


class TestPoolDistribution:
    """Tests for pool distribution algorithm."""

    def make_teams(self, count: int) -> list:
        """Helper to create test teams with descending ratings."""
        teams = []
        for i in range(count):
            rating = 4.0 - (i * 0.1)  # Descending ratings
            teams.append(TeamWithRatings(
                player1=make_player(f"P{i*2+1}", rating),
                player2=make_player(f"P{i*2+2}", rating - 0.1),
                team_rating=rating - 0.05
            ))
        return teams

    def test_15_teams_creates_3_pools_of_5(self):
        """Test that 15 teams → 3 pools of 5."""
        teams = self.make_teams(15)
        pools = distribute_teams_to_pools(teams)

        assert len(pools) == 3
        assert all(p.team_count == 5 for p in pools)

    def test_12_teams_creates_3_pools_of_4(self):
        """Test that 12 teams → 3 pools of 4."""
        teams = self.make_teams(12)
        pools = distribute_teams_to_pools(teams)

        assert len(pools) == 3
        assert all(p.team_count == 4 for p in pools)

    def test_14_teams_creates_pools_of_5_5_4(self):
        """Test that 14 teams → pools of 5, 5, 4."""
        teams = self.make_teams(14)
        pools = distribute_teams_to_pools(teams)

        assert len(pools) == 3
        # Larger pools should come first (higher-rated teams)
        assert pools[0].team_count == 5
        assert pools[1].team_count == 5
        assert pools[2].team_count == 4

    def test_16_teams_creates_4_pools_of_4(self):
        """Test that 16 teams → 4 pools of 4."""
        teams = self.make_teams(16)
        pools = distribute_teams_to_pools(teams)

        assert len(pools) == 4
        assert all(p.team_count == 4 for p in pools)

    def test_20_teams_creates_4_pools_of_5(self):
        """Test that 20 teams → 4 pools of 5."""
        teams = self.make_teams(20)
        pools = distribute_teams_to_pools(teams)

        assert len(pools) == 4
        assert all(p.team_count == 5 for p in pools)

    def test_teams_sorted_by_rating_before_pool_assignment(self):
        """Test that teams are sorted by rating before pool assignment."""
        teams = self.make_teams(10)
        pools = distribute_teams_to_pools(teams)

        # Pool A should have highest rated teams
        pool_a_ratings = [t.team_rating for t in pools[0].teams]
        pool_b_ratings = [t.team_rating for t in pools[1].teams]

        assert min(pool_a_ratings) >= max(pool_b_ratings)

    def test_pool_a_contains_highest_rated_teams(self):
        """Test that Pool A contains highest-rated teams overall."""
        teams = self.make_teams(10)
        pools = distribute_teams_to_pools(teams)

        # Sort all teams by rating
        all_sorted = sorted(teams, key=lambda t: t.team_rating, reverse=True)
        top_5 = all_sorted[:5]

        # Pool A should have these top 5 teams
        for team in pools[0].teams:
            assert team in top_5

    def test_pool_points_5_teams_9_points(self):
        """Test that 5-team pools have 9 points per game."""
        teams = self.make_teams(5)
        pools = distribute_teams_to_pools(teams)

        assert pools[0].points_per_game == 9

    def test_pool_points_4_teams_11_points(self):
        """Test that 4-team pools have 11 points per game."""
        teams = self.make_teams(4)
        pools = distribute_teams_to_pools(teams)

        assert pools[0].points_per_game == 11

    def test_pool_names_alphabetical(self):
        """Test that pools are named alphabetically (A, B, C, ...)."""
        teams = self.make_teams(15)
        pools = distribute_teams_to_pools(teams)

        assert pools[0].name == "A"
        assert pools[1].name == "B"
        assert pools[2].name == "C"

    def test_court_numbers_assigned_sequentially(self):
        """Test that court numbers are assigned 2 per pool, sequential."""
        teams = self.make_teams(15)
        pools = distribute_teams_to_pools(teams)

        assert pools[0].court_start == 1
        assert pools[0].court_end == 2
        assert pools[1].court_start == 3
        assert pools[1].court_end == 4
        assert pools[2].court_start == 5
        assert pools[2].court_end == 6

    def test_empty_teams_list(self):
        """Test handling of empty teams list."""
        pools = distribute_teams_to_pools([])
        assert len(pools) == 0

    def test_single_team(self):
        """Test handling of single team."""
        teams = self.make_teams(1)
        pools = distribute_teams_to_pools(teams)

        assert len(pools) == 1
        assert pools[0].team_count == 1


class TestHTMLAccessibility:
    """Tests for HTML accessibility features."""

    def test_includes_language_attribute(self):
        """Test that html tag has lang attribute."""
        players = [make_player("John", 4.0), make_player("Jane", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert 'lang="en"' in html

    def test_includes_viewport_meta(self):
        """Test that viewport meta tag is included for mobile."""
        players = [make_player("John", 4.0), make_player("Jane", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert "viewport" in html

    def test_includes_charset_meta(self):
        """Test that charset is specified."""
        players = [make_player("John", 4.0), make_player("Jane", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert "UTF-8" in html

    def test_includes_bootstrap_icons(self):
        """Test that Bootstrap Icons are included."""
        players = [make_player("John", 4.0), make_player("Jane", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert "bootstrap-icons" in html

    def test_profile_link_has_title_tooltip(self):
        """Test that profile links have tooltips."""
        players = [make_player("John", 4.0, found=True), make_player("Jane", 3.5)]
        html = generate_dupr_ladder_html(players)

        assert 'title="View DUPR Profile"' in html


class TestResponsiveDesign:
    """Tests for responsive design features."""

    def test_ladder_uses_responsive_columns(self):
        """Test that ladder uses Bootstrap responsive columns."""
        players = [
            make_player("High", 4.0),
            make_player("Low", 2.5)
        ]
        html = generate_dupr_ladder_html(players)

        assert "col-12" in html
        assert "col-lg-6" in html

    def test_partner_uses_responsive_layout(self):
        """Test that partner uses responsive layout."""
        teams = [TeamWithRatings(
            player1=make_player("John", 4.0),
            player2=make_player("Jane", 3.5),
            team_rating=3.675
        )]
        html = generate_partner_dupr_html(teams)

        # Check for responsive CSS in styles
        assert "@media" in html
        assert "pool-card" in html
