import { parseSearchResults } from './search';
import { parseTopRanking } from './top';
import type { MediaKind, ParseResult } from './types';

export type Route = { kind: MediaKind; parse(doc: Document): ParseResult };

const ROUTES: Record<string, Route> = {
  '/anime.php': { kind: 'anime', parse: (doc) => parseSearchResults(doc, 'anime') },
  '/manga.php': { kind: 'manga', parse: (doc) => parseSearchResults(doc, 'manga') },
  '/topanime.php': { kind: 'anime', parse: (doc) => parseTopRanking(doc, 'anime') },
  '/topmanga.php': { kind: 'manga', parse: (doc) => parseTopRanking(doc, 'manga') },
};

/** The manifest's match patterns are only the first gate; this is the exact allow-list. */
export function routeFor(loc: Pick<Location, 'pathname'>): Route | undefined {
  return ROUTES[loc.pathname];
}
