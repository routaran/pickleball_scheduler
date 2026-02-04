#!/usr/bin/env python3
"""Generate yellow pickleball icons for the mobile app."""

from PIL import Image, ImageDraw

def create_pickleball_icon(size, output_path):
    """Create a yellow pickleball icon with holes."""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Yellow pickleball color
    ball_color = (255, 215, 0, 255)  # Gold/yellow

    # Draw main circle (pickleball)
    margin = size * 0.05
    draw.ellipse([margin, margin, size - margin, size - margin], fill=ball_color)

    # Draw holes (characteristic of a pickleball)
    hole_color = (0, 0, 0, 0)  # Transparent
    center_x = size / 2
    center_y = size / 2
    hole_radius = size * 0.06

    # Center hole
    draw.ellipse([
        center_x - hole_radius, center_y - hole_radius,
        center_x + hole_radius, center_y + hole_radius
    ], fill=hole_color)

    # Ring of 8 holes around center
    import math
    ring_radius = size * 0.25
    for i in range(8):
        angle = (i * 45) * math.pi / 180
        hole_x = center_x + ring_radius * math.cos(angle)
        hole_y = center_y + ring_radius * math.sin(angle)
        draw.ellipse([
            hole_x - hole_radius, hole_y - hole_radius,
            hole_x + hole_radius, hole_y + hole_radius
        ], fill=hole_color)

    # Outer ring of 12 holes
    outer_ring_radius = size * 0.38
    hole_radius_outer = size * 0.05
    for i in range(12):
        angle = (i * 30) * math.pi / 180
        hole_x = center_x + outer_ring_radius * math.cos(angle)
        hole_y = center_y + outer_ring_radius * math.sin(angle)
        draw.ellipse([
            hole_x - hole_radius_outer, hole_y - hole_radius_outer,
            hole_x + hole_radius_outer, hole_y + hole_radius_outer
        ], fill=hole_color)

    # Save with high quality
    img.save(output_path, 'PNG', quality=100)
    print(f"Created {output_path} ({size}x{size})")

if __name__ == "__main__":
    assets_dir = "packages/mobile/assets"

    # Create all required icons
    create_pickleball_icon(1024, f"{assets_dir}/icon.png")
    create_pickleball_icon(1024, f"{assets_dir}/adaptive-icon.png")
    create_pickleball_icon(1024, f"{assets_dir}/splash-icon.png")
    create_pickleball_icon(192, f"{assets_dir}/favicon.png")

    print("\nAll icons generated successfully!")
