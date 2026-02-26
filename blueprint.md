# You Shou Yan Wiki Remake Blueprint

## Overview
A high-fidelity recreation of the "You Shou Yan" (All Saints Street) Wiki landing page. This version focuses on a professional, card-based UI that mirrors the Citizen skin but with enhanced interactivity and modern CSS techniques.

## Structure
- **Global Navigation**: Top-fixed bar with Logo, Search, and Theme Toggle.
- **Sidebar**: Collapsible navigation with categories (Manhua, Characters, World, Community).
- **Hero Section**: Welcoming banner with a brief series introduction.
- **Character Spotlight**: A grid of beautifully designed cards for main characters (Tianlu, Sibuxiang, Tony, etc.).
- **Quick Links**: Section for important external links and social media.

## Design Decisions
- **Typography**: Inter for primary text, system-ui for performance.
- **Colors**: Refined CSS variables for Light and Dark modes.
- **Components**:
  - `CharacterCard`: Web component for character profiles.
  - `WikiSidebar`: Web component for structured navigation.
  - `ThemeToggle`: Enhanced theme switcher.

## Steps
1. **Core Layout**: Semantic HTML5 structure.
2. **Modern CSS**: Baseline features (Cascade Layers, :has selector, Logical Properties).
3. **Dynamic Elements**: JavaScript for sidebar toggling and theme persistence.
