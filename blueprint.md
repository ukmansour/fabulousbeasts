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

## Character Reorganization (2026.05.04)

**Objective:** Organize characters into specific categories based on the D1 database for better navigation and classification.

**Changes:**
1.  **Updated Categories (`characters/index.js`)**:
- **Cloudflare D1 & R2 연동**: Firestore와 별개로 고성능/저비용 데이터베이스 및 이미지 스토리지를 구축했습니다.
- **문서 동기화**: 위키 문서의 본문, 인포박스(이름, 사진 등), 갤러리를 D1에 저장하고 실시간으로 불러옵니다.
- **홈페이지 이미지/이름 동기화**: 위키에서 편집한 내용이 첫 화면의 캐릭터 카드에도 즉시 반영됩니다.
- **사용자 관리 자동화**: 회원가입 시 자동으로 데이터베이스에 유저 정보를 동기화하여 관리자 탭에서 즉시 확인할 수 있습니다.
- **편의성 개선**: 상세 페이지 상단에 '🏠 홈으로' 돌아가기 버튼을 추가했습니다.

## [Current Plan] 캐릭터 생일 알림 및 애니메이션 댓글/좋아요 구현

**목표**:
1. 에디터 내 생일 입력 필드를 활용하여 상세 페이지에 다음 생일 YYYY년 MM월 DD일 및 디데이(D-Day)를 계산하여 표시하고, 생일 당일인 캐릭터가 있을 경우 홈 화면에 축하 배너를 동적으로 자동 노출합니다.
2. 애니메이션 시청 페이지(`watch.html`) 하단에 회차별 댓글 작성/삭제 및 좋아요 토글 기능(싫어요 없음)을 구현하여 유저 상호작용을 향상합니다. 로그인한 유저만 댓글 작성 및 좋아요를 누를 수 있습니다.

**세부 계획**:
1. **API 및 DB 스키마 수정 (`functions/api/[[path]].js`)**:
   - `/api/images`가 캐릭터 정보 로드 시 `birthday` 필드도 함께 가져오도록 쿼리 수정.
   - `video_comments` 및 `video_likes` 테이블 자동 생성 구문 추가.
   - 댓글 목록 조회(`GET /api/comments`), 작성(`POST /api/comments`), 삭제(`POST /api/comments/delete`) 엔드포인트 구현.
   - 좋아요 정보 조회(`GET /api/likes`), 토글(`POST /api/likes`) 엔드포인트 구현.
2. **생일 알림 UI 구현**:
   - 홈 화면(`index.html`, `main.js`) 상단에 오늘 생일인 캐릭터 배너 영역 및 동적 렌더링 코드 추가.
   - 상세 페이지(`detail.js`) 인포박스 내부 생일 항목에 다음 생일 날짜/디데이/오늘 생일 표시 로직 탑재.
   - 에디터(`edit.html`) 생일 입력란의 플레이스홀더를 개선하여 입력 형식 가이드라인 제시.
3. **애니메이션 댓글/좋아요 UI 구현**:
   - 시청 화면(`watch.html`, `watch.js`) 비디오 정보 하단에 좋아요 하트 버튼 및 댓글 쓰기/목록 공간 추가.
   - 재생되는 회차가 바뀔 때마다 해당 회차의 댓글 및 좋아요 현황을 실시간으로 가져와 화면을 갱신.
   - 스타일(`style.css`)에 생일 배너, 좋아요 버튼(토글 시 하트 채워짐 및 붉은색 활성화), 댓글 리스트, 비로그인 알림 등의 스타일 정의.



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

## Timezone Display Fix (Current Update)

**Objective:** Fix an issue where the document modification time retrieved from D1 (UTC) was displayed 9 hours behind local time (KST).

**Changes:**
1.  **Date Normalization (`detail.js`, `main.js`)**:
    *   Standardized the SQLite `CURRENT_TIMESTAMP` output (e.g., `YYYY-MM-DD HH:MM:SS`) to a valid ISO 8601 string (`YYYY-MM-DDTHH:MM:SSZ`) before instantiating the JavaScript `Date` object.
    *   This ensures the browser accurately interprets the date string as UTC instead of implicitly assuming it is already local time.
    *   When `.toLocaleString('ko-KR')` is invoked, the UTC time is successfully converted to KST (+9 hours), resolving the 9-hour offset issue in both recent changes and document detail views.

## Mobile Layout & Recent Changes (2026.05.04)

**Objective:** Improve mobile responsiveness by ensuring 'Recent Changes' are visible even when the sidebar is hidden, and fix time display issues.

**Changes:**
1.  **Responsive Sidebar (`index.html`, `style.css`)**:
    *   Added an inline 'Recent Changes' section that appears at the bottom of the page on screens narrower than 1024px.
    *   Ensured consistent styling between the sidebar and inline recent changes lists.
2.  **Recent Changes Synchronization (`main.js`)**:
    *   Updated the data fetching logic to populate both the sidebar and the mobile-friendly inline list simultaneously.
    *   Improved date formatting consistency across all views.

## Rich Editing Features & Modern UI (2026.05.05)

**Objective:** Expand the editing capabilities to support professional wiki elements and provide a better UX with real-time preview and modern styles.

**Changes:**
1.  **Extended Wiki Syntax (`detail.js`, `edit.js`)**:
    *   Added support for **Tables**, **Spoilers (Details/Summary)**, **Blockquotes**, **Text Colors**, **Underline**, and **Strikethrough**.
    *   Implemented special block elements: **[note]** (Note box), **[warn]** (Warning box), and **[center]** (Center alignment).
    *   Added **Internal Linking** syntax: `[[Character Name]]`.
2.  **Enhanced Editor UI (`edit.html`, `edit.js`)**:
    *   Redesigned the toolbar with grouped icons and a **Color Palette** picker.
    *   Added a **Live Preview Modal** that allows editors to verify content before saving.
    *   Simplified block styles (Spoilers, Notes, Warnings) to use clean, line-based designs instead of heavy boxes, as per user feedback.
3.  **Cache Busting & Stability (`detail.html`)**:
    *   Implemented versioned asset loading (`?v=3`) for `detail.js` and `style.css` to ensure users see the latest rendering logic immediately after deployment.
    *   Rewrote the rendering engine into a stable **Line-by-Line State Machine** to prevent HTML nesting errors.
