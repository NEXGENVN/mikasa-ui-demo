# MIKASA Figma Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Publish an interactive Web and App preview matching the supplied Mikasa Figma design on GitHub Pages.

**Architecture:** Buildless HTML/CSS/ES modules in `figma-preview/`; shared demo data and primitives, dedicated Web and App renderers, browser-local actions, native dialogs. Keep the existing demos available.

**Tech Stack:** HTML, CSS custom properties, JavaScript modules, Node built-in test runner for demo-state logic, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-18-mikasa-figma-preview-design.md` (approved by user on 18 November 2026).

## Global Constraints

- Use the exact Figma light/dark and status tokens, Roboto typography, downloaded Figma icons and seven supplied Drive SVG illustrations.
- Publish at `/figma-preview/` in `NEXGENVN/mikasa-ui-demo`; all mutations use sample data only.
- Support desktop, portrait Web and 390px App preview, with functional forms, navigation, filtering, pagination and export.

## Review Focus

- Blank/invalid phone numbers must block confirmation; OA quantity stays between 1 and 5.
- Filters with zero matches show a useful empty state and reset control.
- Entered values render as text, including HTML-looking values.
- Switching platform/theme/screen does not lose the current demo request.
- Dialogs work by keyboard, and narrow viewports keep primary actions reachable.

### Task 1: Shared preview and assets

**Files:** `figma-preview/index.html`, `styles.css`, `assets/`, `core.mjs`, `core.test.mjs`.
**Interfaces:** `createDemoState()`, `validatePhone(value)`, `createRequest(state,input)`, `filterMessages(messages,filters)`, `escapeHtml(value)`; asset registry from original Figma exports.

- [x] Create isolated working checkout and copy approved spec/plan.
- [x] Write and run failing tests for phone validation, OA bounds, filter results, escaped text and state transitions.
- [x] Download original assets; implement the shared state and tokens, header, preview screen selector and native dialog/toast primitives.
- [x] Run state tests and syntax checks.

### Task 2: Web administration preview

**Files:** `figma-preview/web.mjs`, `styles.css`.
**Interfaces:** `renderWeb(state,route)` returns HTML; common `data-action` handlers mutate demo state and navigate.

- [x] Implement sidebar and login from Figma; implement dashboard, accounts/recovery, OA/GIF/messages, history/details, reports, security and role/settings screens.
- [x] Wire search, filters, pagination, create/edit dialogs, checkboxes, tabs and CSV export with sample data.
- [x] Verify desktop and portrait layouts, including zero-result filtering and escaped input.

### Task 3: App preview

**Files:** `figma-preview/mobile.mjs`, `app.mjs`, `styles.css`.
**Interfaces:** `renderMobile(state,route)` returns HTML and shares request state with Web.

- [x] Implement login, overview, sending steps, history, details, account and settings screens from Figma.
- [x] Wire phone validation, 1–5 OA, scheduling, confirmation, progress and sample result changes; support back/cancel/logout.
- [x] Add error/empty/loading gallery, palette/typography page and reset action; use the supplied SVGs.
- [x] Exercise sending and history flows at 390px and test platform/theme switching.

### Task 4: Validate and publish

**Files:** `figma-preview/README.md`, repository documentation and preview files only.

- [x] Run Node tests, module syntax checks, asset/route inspection and `git diff --check`.
- [x] Browser-check key Web/App flows, dialogs, themes and responsive sizes; fix observed failures.
- [x] Request focused independent final review, address material issues, commit and push the preview files.
- [ ] Wait for GitHub Pages success, verify live URL and return the published link.
