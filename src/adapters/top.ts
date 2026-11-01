import { clean, mediaLink, toNumber } from './common';
import { posterSources } from './posters';
import type { MediaCard, MediaKind, ParseResult } from './types';

/**
 * topanime.php / topmanga.php put everything except rank and score in one block:
 *   "TV (28 eps)<br>Sep 2023 - Mar 2024<br>1,538,859 members"
 *   "Manga (? vols)<br>Aug 1989 - <br>813,545 members"
 */
const FORMAT_LINE = /^(.+?) \((\?|[\d,]+) (eps|vols|chps?)\)$/;
const MEMBERS_LINE = /^([\d,]+) members$/;

type Info = Pick<
  MediaCard,
  'format' | 'episodes' | 'volumes' | 'chapters' | 'startDate' | 'endDate' | 'year' | 'members'
>;

export function parseInformation(block: Element | null): Info {
  const info: Info = {};
  if (!block) return info;
  // Lines are separated by <br>; textContent alone would glue them together.
  const lines = [...block.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean);

  for (const line of lines) {
    const format = FORMAT_LINE.exec(line);
    const members = MEMBERS_LINE.exec(line);
    if (format) {
      const [, type, count, unit] = format;
      info.format = type;
      const n = toNumber(clean(count));
      if (unit === 'eps') info.episodes = n;
      else if (unit === 'vols') info.volumes = n;
      else info.chapters = n;
    } else if (members) {
      info.members = toNumber(members[1]);
    } else if (line.includes('-') || /\d{4}/.test(line)) {
      const [start, end] = line.split(/\s+-\s*|\s*-\s+|^-$/).map((s) => clean(s));
      info.startDate = start;
      info.endDate = end;
      const year = start?.match(/\b(\d{4})\b/)?.[1];
      if (year) info.year = Number(year);
    }
  }
  return info;
}

export function findTopTable(doc: Document): HTMLTableElement | null {
  return doc.querySelector<HTMLTableElement>('table.top-ranking-table');
}

export function parseTopRanking(doc: Document, kind: MediaKind): ParseResult {
  const table = findTopTable(doc);
  if (!table) return { ok: false, reason: 'ranking table not found' };

  const rows = [...table.rows].filter((r) => !r.classList.contains('table-header'));
  const cards: MediaCard[] = [];
  const addButtons = new Map<number, HTMLAnchorElement>();

  for (const row of rows) {
    const titleLink = row.querySelector<HTMLAnchorElement>('td.title h3 a');
    const link = mediaLink(titleLink?.getAttribute('href') ?? null, kind);
    const title = clean(titleLink?.textContent);
    if (!link || !title) return { ok: false, reason: `unreadable row ${cards.length + 1}` };

    const add = row.querySelector<HTMLAnchorElement>('td.status a.Lightbox_AddEdit');
    if (add) addButtons.set(link.id, add);

    cards.push({
      kind,
      ...link,
      title,
      poster: posterSources(row.querySelector('td.title img')),
      rank: toNumber(clean(row.querySelector('td.rank')?.textContent)),
      score: toNumber(clean(row.querySelector('td.score .score-label')?.textContent)),
      ...parseInformation(row.querySelector('td.title .information')),
    });
  }

  if (cards.length === 0) return { ok: false, reason: 'no entries' };
  return { ok: true, page: { kind, table, cards, sortLinks: [], addButtons } };
}
