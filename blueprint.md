# Blueprint

## Overview

This project is a comprehensive wiki for '유수언' (YouShouYan), providing detailed information about various characters. It is built with a modern, framework-less approach using HTML, CSS, and ES Modules.

## Implemented Features

*   **Comprehensive Character Database:** A hierarchical collection of character data, including detailed descriptions of settings, appearances, personalities, and abilities.
*   **Markdown-like Rendering:** Custom rendering engine for `details` fields, supporting headers, images, links, bold/italic text, and lists.
*   **Global Document Locking:** Anti-vandalism system where only authorized users (`admin`, `editor`) can edit content.
*   **Role-Based Access Control (RBAC):** Integrated with Firebase Auth and Firestore to manage permissions.
*   **Table of Contents (TOC):** Automatically generated from document headers for easy navigation.
*   **Animated Feature Promotion:** Dedicated banner and pages for viewing animations.

## Editor Enhancements & Security (Latest Update)

**Objective:** Fix Markdown rendering issues (bold, images), enable direct image URL preview, and restrict editing to administrators only.

**Changes:**
1.  **Enhanced Rendering (`detail.js`)**:
    *   Improved regex for bold text (**text** or __text__) and italic text (*text* or _text_).
    *   Enabled automatic image rendering for direct URLs (e.g., http...jpg).
    *   Fixed list rendering and improved TOC navigation.
2.  **Role-Based Access Control (RBAC)**:
    *   Updated `detail.js` and `edit.js` to restrict all modification features to users with the `admin` role only.
    *   Added visual feedback (opacity, tooltips) for non-admin users.
3.  **Content Purge**:
    *   Reset `characters/index.js` to remove all previous descriptions, providing a clean slate for the administrator to rebuild the wiki.

## Character Relocation (2026.04.30)

**Objective:** Elevate '사불상 (四不像)' to the main character category as requested.

**Changes:**
1.  **Category Update (`characters/index.js`)**:
    *   Moved '사불상 (四不像)' from `녹인점` -> `주인` to `메인 캐릭터` -> `사장님`.
    *   Updated the character's internal category tag to `메인 캐릭터`.
    *   This ensures he appears at the top of the character list and is correctly grouped with other primary characters.

## Global Data Synchronization (2026.04.30)

**Objective:** Ensure that name and category changes made in the editor are reflected throughout the application (Home page, Search, etc.).

**Changes:**
1.  **Enhanced Editor (`edit.html`, `edit.js`)**:
    *   Added a **Category** selection field to the editor sidebar.
    *   Updated the save logic to persist both `name` and `category` to Firestore.
    *   This allows administrators to rename characters or reassign their categories directly from the UI.
2.  **Robust Synchronization (`main.js`)**:
    *   Verified the merge logic that combines static data (`data.js`) with dynamic Firestore data.
    *   Ensured that the Home page re-renders immediately after cloud data is fetched, updating character cards and search results with the latest names and categories.

