# Blueprint

## Overview

This project is a web application that provides information about various characters. It is built with HTML, CSS, and JavaScript, and it uses Web Components to create reusable UI elements.

## Implemented Features

*   **Character Data:** Displays information about characters, including their personality, name origin, and trivia.
*   **Web Components:** Uses custom elements for displaying character information.
*   **Global Document Locking (Anti-Vandalism):** To prevent unauthorized changes, all documents are locked by default. Only users with `admin` or `editor` roles can edit content.
*   **Role-Based Access Control (RBAC):**
    *   `admin`: Full control over all documents and user roles.
    *   `editor`: Authorized to edit character documents and categories.
    *   `member`: Regular users who can only read content and manage their own profiles.
*   **Security Rules:** Firestore security rules enforce that only `isEditor()` (admin or editor) can perform write operations on protected collections.

## Current Plan: Performance Optimization

**Objective:** Improve the application's loading and rendering performance.

**Problem:** The `characters/index.js` file contains a large amount of hardcoded character data as JavaScript strings. This increases the initial script parsing time and memory usage, leading to a slow user experience.

**Solution:**

1.  **Externalize Data:** Move the character data from `characters/index.js` into a separate `characters.json` file.
2.  **Dynamic Loading:** Modify `characters/index.js` to dynamically fetch the character data from `characters.json` using the `fetch` API.
3.  **Update Logic:** Update the application logic to process the fetched JSON data instead of the hardcoded strings.

This will result in a smaller initial JavaScript payload and on-demand loading of data, significantly improving performance.
