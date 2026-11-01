# MAL Visual Refresh: Project Report

*Status as of 1 November 2026 · version 0.1.0 (pre-release)*

## 1. Summary

MAL Visual Refresh is a Chrome (Manifest V3) extension that adds a poster-first view to four MyAnimeList pages: anime search, manga search, top anime and top manga. It turns MAL's 50×70-thumbnail tables into grids, poster walls or lists using MAL's full-size artwork. It also adds a full-screen "full view" for each entry and can always switch back to MAL's original table in one click.

It is purely a frontend layer. There is no server, no account, no analytics and no third-party API. MAL still does all searching, sorting, paging and list management.

| | |
| --- | --- |
| Pages supported | 4 (`anime.php`, `manga.php`, `topanime.php`, `topmanga.php`) |
| Layouts | Grid, Posters, List, Original |
| Permissions | `storage`, plus content-script access to the 4 pages |
| Bundle size | ~25 KB JS, ~11 KB CSS, no runtime dependencies |
| Tests | 20 automated tests on fixtures captured from the live pages |

## 2. Goal and scope

The original plan set the first success as: *open a search page, browse a clean poster grid, open an anime, and restore the original listing with one control.* The main user need was that **people recognise shows by their posters faster than by their titles**, and MAL's tiny thumbnails make that hard.

**Delivered**
- Everything in the plan's MVP: grid, consistent poster frames, essential info, density/size control, Original view, an enable/disable setting that persists, scoped styling, a fallback to the native page, and accessible controls.
- Beyond the MVP, at the user's request:
  - higher-resolution posters
  - Posters and List layouts
  - a continuous size slider
  - full view with poster zoom and keyboard browsing
  - support for manga search and both top lists
  - rank medals

**Deliberately not done** (deferred in the plan):
- account writes or scoring from cards
- personal list pages
- API enrichment
- custom poster uploads
- infinite scroll
- Firefox

## 3. How it works

```
 MAL page loads
      │
      ▼
 routes.ts ── not one of the 4 pages? ──► do nothing
      │
      ▼
 adapter (search.ts / top.ts) reads MAL's table into plain data
      │            any row unreadable? ──► keep MAL's view, log reason
      ▼
 ui/ builds toolbar + cards + full view in a detached element
      │
      ▼
 lifecycle.ts inserts it next to MAL's table, then hides only that table
      │
      ▼
 settings changes (toolbar / popup / other tab) ──► chrome.storage ──► re-apply
```

The code is split into four parts, as the plan recommended:

| Part | Files | Responsibility |
| --- | --- | --- |
| Route detection | `adapters/routes.ts` | Exact allow-list of the 4 paths, each mapped to its parser |
| Adapters | `adapters/search.ts`, `top.ts`, `posters.ts`, `common.ts` | Read the page into `MediaCard` objects without changing the page |
| Renderer | `ui/cards.ts`, `toolbar.ts`, `fullview.ts`, `poster.ts`, `dom.ts` | Build all UI with `textContent`, never `innerHTML` |
| Lifecycle and settings | `content/lifecycle.ts`, `settings/*` | Mount, hide/restore, error recovery, validated persistent settings |

### Data model

One `MediaCard` type covers both anime and manga. A field is only set when MAL actually shows it on that page. For example, `episodes` is never set on manga, `volumes` is never set on anime, and an unknown count (`?`) stays `undefined` rather than becoming `0`.

## 4. Key design decisions

**Better posters without guessing.** MAL's list thumbnails are `/r/50x70/images/anime/1015/138006.webp?s=…`. Removing the `/r/WxH` resize prefix gives MAL's full image (~225×318), and adding an `l` suffix gives the large image (~425×600). This was checked against the live CDN for both anime and manga before use. Cards use `srcset`, so the browser picks the size it needs for the card width and screen density. If a larger image fails, the card falls back to MAL's own 2× thumbnail, then to a placeholder. Only `https://cdn.myanimelist.net` URLs are accepted.

**Reversibility first.** MAL's table is never removed or cloned. The extension's view is fully built before being inserted, and only then is the table hidden with one class. Turning the extension off or switching to Original removes the class. Pagination, tabs and the search form are outside the table and are never touched. Any error during rendering tears down the extension's view and shows MAL's table again.

**All or nothing per page.** If even one row can't be read, the page stays native. This prevents a grid that silently drops results.

**Columns by header name, not position.** The search columns change depending on the search (keyword searches show 3 data columns, browsing shows up to 7, and manga has Vol./Chap. instead of Eps.). The search adapter maps columns using the header text.

**Native list actions, not copies.** The add/status button on a card calls `.click()` on MAL's hidden original button. MAL's own add-to-list dialog opens with its own logic and login handling, and the extension never writes to anyone's account.

**One settings object everywhere.** Layout, size, fit and synopsis settings are shared by all pages and tabs through `chrome.storage.local`. Settings are validated on every read, and corrupt or outdated data falls back to the defaults.

## 5. Verification

### Automated (20 tests, Vitest + jsdom)

- **Fixtures** were captured from the real pages (signed out, tracking attributes stripped):
  - anime search
  - manga search (all columns)
  - top anime
  - top upcoming anime (no scores, unknown counts, missing dates)
  - top manga (ongoing series, Novel entries)
- **Parsers:**
  - row order
  - every field per page
  - unknown values left undefined
  - reduced keyword-search columns
  - rejecting foreign links
  - refusing the whole page on one unreadable row
- **Posters:** URL derivation for anime and manga; rejecting other hosts, `javascript:` URLs and MAL's "no image" placeholder.
- **Settings:** validation and fallback; two overlapping saves both kept.
- **Routes:** only the 4 paths are accepted.

### In the browser

Live MAL pages were inspected directly. The built extension was then run on saved copies of each real page, in MAL's dark mode. The full checks:

- **All 4 pages:** 50 of 50 cards, in MAL's order. Pagination, category tabs and "Next 50" links still visible.
- **Layouts and controls:**
  - all four layouts, the size slider and presets
  - fit/fill
  - the synopsis toggle (hidden where MAL gives no synopsis)
  - Sort by… (hidden where MAL has no sort links)
- **Full view:**
  - opening, ←/→ browsing
  - Z zoom, Esc
  - focus returning correctly
  - the large poster loading
- **Original view, disable and re-enable:** the table comes back, and there are no duplicate cards, roots or dialogs afterwards.
- **The add button** opens MAL's own add-to-list lightbox.

### Bugs found and fixed during testing

| Problem | Cause | Fix |
| --- | --- | --- |
| Size presets showed "C C L" | "compact" and "comfortable" both start with C | Labelled S / M / L |
| Rank appeared twice in full view | Shown as a badge and as a details row | Removed the row |
| Rank and score badges squashed | MAL's `.page-common span { padding: 0 }` outranked a single class | Badge rules anchored on an id |
| Full-view title small and centred | MAL's global `h2` / `dt` / `dd` styles | Same id-anchoring |
| Two quick toolbar clicks lost the first change | Both saves read the old settings before either wrote | Saves run one at a time; covered by a test |

## 6. Known limitations and risks

- **Signed-in pages not verified.** Everything above was tested signed out. Signed-in rows may show extra controls (watch status, Your Score) that the cards don't show yet. This is the most important next check.
- **Depends on MAL's markup.** If MAL changes its tables, the affected page falls back to the native view instead of breaking. The README lists the selectors this depends on, and new fixtures can be captured with `scripts/capture-fixture.mjs`.
- **Image URL pattern is not a documented MAL API.** It's how MAL's own detail pages load images, so it's stable in practice, and the fallback to the original thumbnail covers it if that changes.
- **Name and branding.** "MAL" in the name is fine for a GitHub project with a clear disclaimer. Before any store listing, the extension should get its own name and an original icon (see §8).

## 7. Changes from the original plan

| Plan | Built | Why |
| --- | --- | --- |
| Vite build | esbuild script | Content scripts must be self-contained classic scripts, and esbuild produces those directly without extra configuration |
| Poster fit default: contain | Default: cover | MAL posters are almost exactly the frame's shape, so cover crops very little and looks cleaner |
| Densities: compact / comfortable / large | Slider (110–360 px) plus S/M/L presets | Finer control, as the user asked for zoom |
| Anime search only for v0.1 | Plus manga search, top anime, top manga | Requested by the user; each page has its own parser and fixtures |
| Use existing poster resolution in v0.1 | Full/large CDN images | Verified against the CDN first, with a fallback chain |

## 8. Next steps

1. **Signed-in check** of all four pages: list status button, Your Score, any extra row controls.
2. **Small private beta** with 3–5 MAL users to collect feedback.
3. **Before the Chrome Web Store:**
   - an original name and icon (16/48/128 px)
   - a privacy policy page
   - store screenshots and listing text
   - a `npm run package` zip script
4. **Possible next pages:** seasonal anime (needs its own parser and fixtures).
5. **Firefox** compatibility pass.
