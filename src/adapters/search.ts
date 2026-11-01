import { clean, mediaLink, toNumber, yearFromShortDate } from './common';
import { posterSources } from './posters';
import type { MediaCard, MediaKind, ParseResult, SortLink } from './types';

/** anime.php and manga.php share one table layout; only the columns differ. */
export function findSearchTable(doc: Document): HTMLTableElement | null {
  return doc.querySelector<HTMLTableElement>('.js-categories-seasonal > table');
}

/**
 * Columns depend on the search (keyword searches show fewer, manga has Vol./Chap.
 * instead of Eps. and no Rated), so they are mapped by header label, e.g. "eps", "chap".
 */
function columnIndex(headerRow: HTMLTableRowElement): Map<string, number> {
  const map = new Map<string, number>();
  [...headerRow.cells].forEach((cell, i) => {
    const label = clean(cell.textContent)?.replace(/\.$/, '').toLowerCase();
    if (label) map.set(label, i);
  });
  return map;
}

function sortLinks(headerRow: HTMLTableRowElement, pathname: string): SortLink[] {
  const links: SortLink[] = [];
  for (const a of headerRow.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const label = clean(a.textContent);
    try {
      const url = new URL(a.getAttribute('href')!, `https://myanimelist.net${pathname}`);
      if (label && url.origin === 'https://myanimelist.net' && url.pathname === pathname) {
        links.push({ label, href: url.href });
      }
    } catch {
      /* skip malformed link */
    }
  }
  return links;
}

function synopsis(cell: HTMLTableCellElement | undefined): string | undefined {
  const box = cell?.querySelector('.pt4');
  if (!box) return undefined;
  const copy = box.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('a').forEach((a) => a.remove()); // drop "read more."
  return clean(copy.textContent);
}

export function parseSearchResults(doc: Document, kind: MediaKind): ParseResult {
  const table = findSearchTable(doc);
  if (!table) return { ok: false, reason: 'results table not found' };

  const [headerRow, ...rows] = [...table.rows];
  if (!headerRow || !/title/i.test(headerRow.textContent ?? '')) {
    return { ok: false, reason: 'unrecognised header row' };
  }
  const col = columnIndex(headerRow);
  const titleCol = col.get('title') ?? 1;
  const cell = (row: HTMLTableRowElement, name: string) => {
    const i = col.get(name);
    return i === undefined ? undefined : clean(row.cells[i]?.textContent);
  };

  const cards: MediaCard[] = [];
  const addButtons = new Map<number, HTMLAnchorElement>();

  for (const row of rows) {
    const titleCell = row.cells[titleCol];
    const titleLink = titleCell?.querySelector<HTMLAnchorElement>('a.hoverinfo_trigger');
    const link = mediaLink(titleLink?.getAttribute('href') ?? null, kind);
    const title = clean(titleLink?.textContent);
    // Every data row must be represented; a single unreadable row means we keep the native table.
    if (!link || !title) return { ok: false, reason: `unreadable row ${cards.length + 1}` };

    const add = titleCell!.querySelector<HTMLAnchorElement>('a.Lightbox_AddEdit');
    if (add) addButtons.set(link.id, add);

    const startDate = cell(row, 'start date');
    cards.push({
      kind,
      ...link,
      title,
      poster: posterSources(row.cells[0]?.querySelector('img') ?? null),
      synopsis: synopsis(titleCell),
      format: cell(row, 'type'),
      episodes: toNumber(cell(row, 'eps')),
      volumes: toNumber(cell(row, 'vol')),
      chapters: toNumber(cell(row, 'chap')),
      score: toNumber(cell(row, 'score')),
      members: toNumber(cell(row, 'members')),
      rated: cell(row, 'rated'),
      startDate,
      endDate: cell(row, 'end date'),
      year: yearFromShortDate(startDate),
    });
  }

  if (cards.length === 0) return { ok: false, reason: 'no results' };
  return {
    ok: true,
    page: { kind, table, cards, sortLinks: sortLinks(headerRow, `/${kind}.php`), addButtons },
  };
}
