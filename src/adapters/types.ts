export type MediaKind = 'anime' | 'manga';

export type PosterSources = {
  /** MAL's own 2x listing thumbnail (100x140). Always the last resort before the placeholder. */
  thumb?: string;
  /** Full-size CDN image, ~225x318. */
  medium?: string;
  /** Large CDN image, ~425x600. */
  large?: string;
};

/** One listing entry. Fields a page doesn't show stay undefined; "?" counts are never zero. */
export type MediaCard = {
  kind: MediaKind;
  id: number;
  url: string;
  title: string;
  poster: PosterSources;
  rank?: number;
  score?: number;
  /** TV, Movie, ONA… for anime; Manga, Novel, Manhwa… for manga. */
  format?: string;
  episodes?: number;
  volumes?: number;
  chapters?: number;
  members?: number;
  rated?: string;
  /** As MAL prints it: "09-29-23" on search pages, "Sep 2023" on top lists. */
  startDate?: string;
  endDate?: string;
  year?: number;
  synopsis?: string;
};

export type SortLink = { label: string; href: string };

export type ListingPage = {
  kind: MediaKind;
  /** The native element that our view replaces (and the only one we hide). */
  table: HTMLTableElement;
  cards: MediaCard[];
  sortLinks: SortLink[];
  /** Native add/status anchors by id, so cards can trigger MAL's own list dialog. */
  addButtons: Map<number, HTMLAnchorElement>;
};

export type ParseResult = { ok: true; page: ListingPage } | { ok: false; reason: string };
