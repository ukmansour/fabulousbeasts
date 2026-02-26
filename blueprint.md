# You Shou Yan Wiki: Media & Character Hub Blueprint

## Overview
Expanding the wiki into a comprehensive media hub. This update introduces a dedicated "Watch Anime" theater mode and interactive character dossiers.

## New Features
- **Anime Theater**: A dedicated section with an embedded YouTube player and a playlist selector for "All Saints Street" (You Shou Yan) seasons.
- **Character Dossiers**: Detailed, tabbed views for characters including lore, personality, and relationships.
- **Dynamic Content Switching**: A simple JavaScript-based router to switch between "Home", "Watch", and "Characters" without page reloads.

## Technical Implementation
- **Components**:
  - `VideoPlayer`: A responsive wrapper for YouTube embeds.
  - `CharacterDossier`: A full-screen or modal-style detailed view.
- **State Management**: Simple URL hash tracking (`#home`, `#watch`, `#characters`) for navigation.

## Design
- **Cinematic Mode**: Darkened background when viewing videos.
- **Tabbed Information**: Using CSS `:has` or JS to switch between 'Overview', 'Lore', and 'Gallery' in character details.
