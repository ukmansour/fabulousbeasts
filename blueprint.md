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

... (기존 내용) ...

## Admin Tab Improvements & Document Creation (2026.05.04)

**Objective:** Enhance the administrative interface with better organization and direct document creation tools.

**Changes:**
1.  **Tabbed Admin Interface (`admin.html`)**:
    *   Introduced a tab system to separate different administrative tasks.
    *   Added "사용자 관리" (User Management) and "문서 관리" (Document Management) tabs.
2.  **Document Creation Tool (`admin.js`)**:
    *   Implemented a "새 문서 만들기" (Create New Document) feature within the Document Management tab.
    *   Administrators can now input a specific Document ID and be redirected directly to the editor (`edit.html#ID`).
    *   This provides a structured way to initiate new wiki pages without relying on search fallback links.
3.  **UI/UX Refinement**:
    *   Added a modern, card-based layout for the document creation form.
    *   Included helpful tips and validation to ensure Document IDs are provided before redirection.

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

**Objective:** Balance initial load performance with real-time data accuracy while minimizing database costs.

**Changes:**
1.  **Fully Dynamic Character Grid**:
    *   Removed hardcoded character cards from `index.html`, replaced with a clean dynamic container.
    *   Re-implemented `syncHomepageImages()` in `main.js` to rebuild the entire character grid from D1 data on page load.
    *   This ensures new characters added via the editor appear instantly on the homepage without code updates.
2.  **Zero-Read User Management**:
    *   Updated `admin.js` to prioritize Firebase Auth `displayName` for the administrator's identity, removing a mandatory Firestore read.
    *   Implemented session-based caching for admin roles, significantly reducing repeat database checks.
    *   Replaced the automated "User List" (which fetched the entire `users` collection) with a manual **UID-based Management Console**.
3.  **Real-time Character Synchronization (2026.05.04)**:
    *   The dynamic grid is kept up-to-date via a 30-second polling interval, syncing both the UI and the search data with D1.
4.  **Full Static Content Management**:
    *   Maintains static HTML for global layouts, notices, and guides to eliminate unnecessary database calls for non-character content.

## Document Title & Name Synchronization (2026.05.04)

**Objective:** Ensure that the document's unique identifier (title/URL) is always synchronized with the character's display name.

**Changes:**
1.  **Synchronized ID Architecture (`edit.js`)**:
    *   Updated the save logic to set the `title` (unique ID) equal to the `name` provided in the editor.
    *   This ensures that changing a character's name also updates its URL hash (e.g., `#tianlu` -> `#천록`).
    *   Redirects the user to the new URL hash upon a successful save.
2.  **API Renaming Logic (`functions/api/[[path]].js`)**:
    *   Utilizes the `oldTitle` parameter to perform a SQL `UPDATE` on the primary key in the `wiki_pages` table if the name changes.
    *   Maintains historical revisions by updating their titles to match the new name.
3.  **Data Consistency**:
    *   Prevents empty names from being saved to ensure every document has a valid primary key.
    *   Includes a check to prevent overwriting existing documents if the new name is already in use by another page.

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
