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

## Administrator Management (2026.04.30)

**Objective:** Provide a secure interface for existing administrators to manage user roles and promote/demote members.

**Changes:**
1.  **Admin Management Page (`admin.html`, `admin.js`)**:
    *   Created a dedicated interface to list all registered users.
    *   Implemented role-toggling functionality (Admin <-> Member).
    *   Added security checks to ensure only existing administrators can access this page.
2.  **Navigation Integration**:
    *   Added a "관리자 설정" (Admin Settings) link to the site header, visible only to authorized administrators.
    *   Synchronized user role fetching across `main.js` and `detail.js` for consistent UI feedback.

## Visual Layout Improvements (2026.04.30)

**Objective:** Enhance the visual presentation of document content by optimizing image display sizes and alignment.

**Changes:**
1.  **Image Rendering Optimization (`detail.js`)**:
    *   Set a maximum height (`max-height: 600px`) for all images in the document body to prevent them from overwhelming the layout.
    *   Applied `object-fit: contain` to ensure images maintain their aspect ratio within the constraints.
    *   Added automatic centering (`margin: 20px auto`) and consistent border-radius for a more professional look.

## Functionality Cleanup (2026.04.30)

**Objective:** Remove redundant or risky features to ensure system stability and a cleaner user experience.

**Changes:**
1.  **Removal of Database Reset Feature**:
    *   Deleted the "데이터 초기화" (Database Reset) button from the home page navigation.
    *   Removed the `reset-db.js` utility file and all associated logic.
    *   This prevents accidental data loss and streamlines the administrative interface.

## Performance & Cost Optimization (2026.05.03)

**Objective:** Minimize Firestore read/write operations to reduce costs and improve initial load speed.

**Changes:**
1.  **Full Static Character Rendering**:
    *   Pre-rendered **all character categories and individual cards** (over 100 entries) directly in `index.html`.
    *   Disabled the dynamic `renderCategoryGrid()` function in `main.js` to preserve the static HTML and eliminate initial rendering overhead.
    *   This ensures the entire character grid is visible instantly without any Firestore `getDocs` calls or complex client-side mapping.
2.  **Zero-Read User Management**:
    *   Updated `admin.js` to prioritize Firebase Auth `displayName` for the administrator's identity, removing a mandatory Firestore read.
    *   Implemented session-based caching for admin roles, significantly reducing repeat database checks.
    *   Replaced the automated "User List" (which fetched the entire `users` collection) with a manual **UID-based Management Console**.
    *   Firestore is now accessed **only when performing a specific update action** (Promote/Demote/Ban), fulfilling the goal of zero reads for user listing.
3.  **Lazy Data Fetching**:
    *   Disabled automatic background synchronization of the entire character collection on the home page.
    *   The application now relies on static data for the initial view, fetching specific document details only when a user navigates to a character's detail page or performs a search.
4.  **Full Static Content Management**:
    *   Removed the "Home Screen Editing" features from the Admin Settings (`admin.html`, `admin.js`).
    *   Transitioned all homepage content (Notices, Recent News, Guides) to static HTML in `index.html`.
    *   Disabled dynamic content loading (`loadNotice`) in `main.js` to eliminate associated Firestore reads.
    *   This shifts all structural and informational updates to the codebase, ensuring maximum performance and zero runtime cost for static content.

## Real-time Character Synchronization (2026.05.04)

**Objective:** Ensure that character names and images on the home page reflect the latest edits from the database in real-time without requiring a full page refresh.

**Changes:**
1.  **Dynamic Polling (`main.js`)**:
    *   Implemented `syncHomepageImages()` to fetch the latest character metadata (title, name, image) from the `/api/images` endpoint.
    *   Set a 30-second polling interval to keep the home page UI and search data synchronized with the database.
2.  **UI & Search Data Sync**:
    *   The sync process updates existing character cards in the DOM to reflect name or image changes.
    *   Updates the global `mergedCharacters` array, ensuring that search results always point to the latest character information.
    *   Maintains the performance benefits of static rendering by performing updates asynchronously after the initial load.

## Document Title & Name Separation (2026.05.04)

**Objective:** Stabilize document identifiers (URLs) while allowing flexible display names in the infobox.

**Changes:**
1.  **Stable ID Architecture (`edit.js`)**:
    *   Modified the save logic to keep the `title` (unique ID) constant as the original `charId`.
    *   The `name` field now only updates the display name column in D1, without affecting the primary key or the URL hash.
    *   This prevents "URL breaking" when a character's display name is updated.
2.  **Infobox Persistence**:
    *   Fixed a bug where the display name would reset to the internal ID during editing.
    *   The editor now correctly prioritizes the stored `name` from D1, falling back to static data or the ID only when necessary.
3.  **API Consistency**:
    *   Maintained `ON CONFLICT` support in the backend to handle updates based on the stable `title`.

## Database Migration (Firestore to Cloudflare D1) (2026.05.03)

**Objective:** Migrate the wiki backend from Firebase Firestore to Cloudflare D1 for better performance, cost optimization, and simplified management.

**Changes:**
1.  **D1 Schema Design (`schema.sql`)**:
    *   Created a `wiki_pages` table to store character data, with `title` as the primary key.
    *   Mapped Firestore fields (content, author, category, species, nation, alias, birthday, image, gallery) to SQL columns.
    *   Added indexes on `updated_at` and `category` for optimized querying.
2.  **Worker Backend (`worker.js`)**:
    *   Implemented a Cloudflare Worker to handle D1 queries.
    *   **GET /wiki/:title**: Fetches character data from D1 with automated Cloudflare CDN caching (60s TTL).
    *   **POST /wiki**: Handles document updates using SQL `UPSERT` logic (INSERT ... ON CONFLICT DO UPDATE).
    *   **Cache Invalidation**: Automatically purges the GET cache when a document is updated via POST.
3.  **Wrangler Configuration**:
    *   Bound the D1 database `fabulousbeasts` to the worker as `env.DB`.
    *   Configured both `wrangler.toml` and `wrangler.jsonc` for consistent development environments.
