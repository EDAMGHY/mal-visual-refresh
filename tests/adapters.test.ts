// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { yearFromShortDate } from '../src/adapters/common';
import { posterSources } from '../src/adapters/posters';
import { routeFor } from '../src/adapters/routes';
import { parseSearchResults } from '../src/adapters/search';
import { parseInformation, parseTopRanking } from '../src/adapters/top';
import type { ParseResult } from '../src/adapters/types';
import { DEFAULTS, validate } from '../src/settings/schema';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');
const docFrom = (html: string) => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

function page(result: ParseResult) {
  if (!result.ok) throw new Error(result.reason);
  return result.page;
}

describe('anime search', () => {
  it('parses every row in order with available fields', () => {
    const { cards, sortLinks, addButtons, kind } = page(parseSearchResults(docFrom(fixture('anime-search/results.html')), 'anime'));
    expect(kind).toBe('anime');
    expect(cards.map((c) => c.id)).toEqual([52991, 5114, 61316]);
    expect(cards[0]).toMatchObject({
      kind: 'anime',
      url: 'https://myanimelist.net/anime/52991/Sousou_no_Frieren',
      title: 'Sousou no Frieren',
      format: 'TV',
      episodes: 28,
      score: 9.24,
      members: 1538859,
      rated: 'PG-13',
      startDate: '09-29-23',
      endDate: '03-22-24',
      year: 2023,
    });
    expect(cards[0].volumes).toBeUndefined();
    expect(cards[0].rank).toBeUndefined();
    expect(cards[0].synopsis).toMatch(/^During their decade-long quest/);
    expect(cards[0].synopsis).not.toMatch(/read more/);
    expect(sortLinks.map((l) => l.label)).toEqual(['Type', 'Eps.', 'Score', 'Start Date', 'End Date', 'Members', 'Rated']);
    expect(addButtons.size).toBe(3);
  });

  it('keeps unknown values undefined instead of zero', () => {
    const reZero = page(parseSearchResults(docFrom(fixture('anime-search/results.html')), 'anime')).cards[2];
    expect(reZero.episodes).toBeUndefined();
    expect(reZero.score).toBeUndefined();
    expect(reZero.endDate).toBeUndefined();
  });

  it('maps columns by header so reduced keyword-search columns still work', () => {
    const doc = docFrom(fixture('anime-search/results.html'));
    for (const row of doc.querySelector('table')!.rows) {
      for (let i = 0; i < 4; i++) row.deleteCell(5); // as on keyword searches
    }
    const card = page(parseSearchResults(doc, 'anime')).cards[1];
    expect(card).toMatchObject({ format: 'TV', episodes: 64, score: 9.11 });
    expect(card.members).toBeUndefined();
  });

  it('refuses the whole page when any row is unreadable', () => {
    const doc = docFrom(fixture('anime-search/results.html'));
    doc.querySelectorAll('a.hoverinfo_trigger.fw-b')[1].setAttribute('href', 'https://evil.example/anime/1');
    expect(parseSearchResults(doc, 'anime')).toEqual({ ok: false, reason: 'unreadable row 2' });
  });

  it('rejects manga links on the anime page', () => {
    expect(parseSearchResults(docFrom(fixture('manga-search/results.html')), 'anime').ok).toBe(false);
  });

  it('reports a missing table', () => {
    expect(parseSearchResults(docFrom('<p>nothing</p>'), 'anime').ok).toBe(false);
  });
});

describe('manga search', () => {
  const { cards, sortLinks, addButtons } = page(parseSearchResults(docFrom(fixture('manga-search/results.html')), 'manga'));

  it('reads volumes and chapters, never episodes or rating', () => {
    expect(cards.map((c) => c.id)).toEqual([2, 1706]);
    expect(cards[1]).toMatchObject({
      kind: 'manga',
      title: 'JoJo no Kimyou na Bouken Part 7: Steel Ball Run',
      format: 'Manga',
      volumes: 24,
      chapters: 96,
      score: 9.34,
      members: 334166,
      year: 2004,
    });
    expect(cards[1].episodes).toBeUndefined();
    expect(cards[1].rated).toBeUndefined();
    expect(cards[1].poster.large).toMatch(/^https:\/\/cdn\.myanimelist\.net\/images\/manga\/\d+\/\d+l\.(webp|jpg)$/);
    expect(sortLinks.map((l) => l.label)).toContain('Chap.');
    expect(sortLinks.every((l) => l.href.startsWith('https://myanimelist.net/manga.php?'))).toBe(true);
    expect(addButtons.get(2)?.href).toContain('/ownlist/manga/add?selected_manga_id=2');
  });

  it('treats unknown counts and open end dates as unknown', () => {
    expect(cards[0]).toMatchObject({ title: 'Berserk', score: 9.46, startDate: '08-25-89', year: 1989 });
    expect(cards[0].volumes).toBeUndefined();
    expect(cards[0].chapters).toBeUndefined();
    expect(cards[0].endDate).toBeUndefined();
  });
});

describe('top anime', () => {
  it('reads rank, score and the information block', () => {
    const { cards, sortLinks, addButtons } = page(parseTopRanking(docFrom(fixture('top/anime.html')), 'anime'));
    expect(cards[0]).toMatchObject({
      kind: 'anime',
      id: 52991,
      title: 'Sousou no Frieren',
      rank: 1,
      score: 9.24,
      format: 'TV',
      episodes: 28,
      startDate: 'Sep 2023',
      endDate: 'Mar 2024',
      year: 2023,
      members: 1538859,
    });
    expect(cards[0].poster.large).toMatch(/^https:\/\/cdn\.myanimelist\.net\/images\/anime\/1015\/138006l\.(webp|jpg)$/);
    expect(cards[1]).toMatchObject({ id: 5114, rank: 2, episodes: 64 });
    expect(sortLinks).toEqual([]);
    expect(addButtons.get(52991)?.textContent?.trim()).toBe('Add to My List');
  });

  it('handles upcoming entries with no score, unknown episodes and missing dates', () => {
    const { cards } = page(parseTopRanking(docFrom(fixture('top/anime-upcoming.html')), 'anime'));
    const [dandadan, movie, bocchi] = cards;
    expect(dandadan).toMatchObject({ rank: 1, format: 'TV', startDate: '2027', year: 2027 });
    expect(dandadan.score).toBeUndefined();
    expect(dandadan.episodes).toBeUndefined();
    expect(dandadan.endDate).toBeUndefined();
    expect(movie).toMatchObject({ format: 'Movie', episodes: 1, startDate: '2027', endDate: '2027' });
    expect(bocchi.startDate).toBeUndefined();
    expect(bocchi.year).toBeUndefined();
    expect(bocchi.members).toBe(123986);
  });
});

describe('top manga', () => {
  it('reads volumes, ongoing runs and non-manga formats', () => {
    const { cards } = page(parseTopRanking(docFrom(fixture('top/manga.html')), 'manga'));
    expect(cards.map((c) => c.id)).toEqual([2, 1706, 162032]);
    expect(cards[0]).toMatchObject({ kind: 'manga', rank: 1, format: 'Manga', startDate: 'Aug 1989', year: 1989 });
    expect(cards[0].volumes).toBeUndefined();
    expect(cards[0].endDate).toBeUndefined();
    expect(cards[1]).toMatchObject({ volumes: 24, startDate: 'Jan 2004', endDate: 'Apr 2011' });
    expect(cards[2]).toMatchObject({ rank: 5, format: 'Novel', volumes: 18, members: 27129 });
    expect(cards[2].episodes).toBeUndefined();
  });
});

describe('parseInformation', () => {
  const info = (html: string) => parseInformation(docFrom(`<div>${html}</div>`).querySelector('div'));
  it('reads chapter counts and multi-word formats', () => {
    expect(info('Light Novel (1,203 chps)<br>2010 - 2020<br>5 members')).toMatchObject({
      format: 'Light Novel',
      chapters: 1203,
      startDate: '2010',
      endDate: '2020',
      members: 5,
    });
  });
});

describe('routeFor', () => {
  it('only accepts the four supported pages', () => {
    expect(routeFor({ pathname: '/anime.php' })?.kind).toBe('anime');
    expect(routeFor({ pathname: '/manga.php' })?.kind).toBe('manga');
    expect(routeFor({ pathname: '/topanime.php' })?.kind).toBe('anime');
    expect(routeFor({ pathname: '/topmanga.php' })?.kind).toBe('manga');
    expect(routeFor({ pathname: '/anime/52991/Sousou_no_Frieren' })).toBeUndefined();
    expect(routeFor({ pathname: '/animelist/someone' })).toBeUndefined();
  });
});

describe('posterSources', () => {
  const img = (attrs: string) => docFrom(`<img ${attrs}>`).querySelector('img');

  it('derives full and large CDN images from the resized thumbnail', () => {
    const s = posterSources(
      img(
        'data-srcset="https://cdn.myanimelist.net/r/50x70/images/anime/1015/138006.webp?s=a 1x, https://cdn.myanimelist.net/r/100x140/images/anime/1015/138006.webp?s=b 2x"',
      ),
    );
    expect(s).toEqual({
      thumb: 'https://cdn.myanimelist.net/r/100x140/images/anime/1015/138006.webp?s=b',
      medium: 'https://cdn.myanimelist.net/images/anime/1015/138006.webp',
      large: 'https://cdn.myanimelist.net/images/anime/1015/138006l.webp',
    });
  });

  it('handles manga covers', () => {
    expect(posterSources(img('data-src="https://cdn.myanimelist.net/r/50x70/images/manga/1/157897.webp?s=x"')).large).toBe(
      'https://cdn.myanimelist.net/images/manga/1/157897l.webp',
    );
  });

  it('keeps only the thumbnail for unknown URL shapes', () => {
    expect(posterSources(img('src="https://cdn.myanimelist.net/something/else.png"'))).toEqual({
      thumb: 'https://cdn.myanimelist.net/something/else.png',
    });
  });

  it('rejects other hosts, missing images and MAL placeholders', () => {
    expect(posterSources(img('src="https://evil.example/a.jpg"'))).toEqual({});
    expect(posterSources(img('src="javascript:alert(1)"'))).toEqual({});
    expect(posterSources(img('data-src="https://cdn.myanimelist.net/r/50x70/images/qm_50.gif"'))).toEqual({});
    expect(posterSources(null)).toEqual({});
  });
});

describe('settings', () => {
  it('falls back to defaults for corrupt or outdated data', () => {
    expect(validate(undefined)).toEqual(DEFAULTS);
    expect(validate({ schemaVersion: 0, view: 'list' })).toEqual(DEFAULTS);
    expect(validate({ schemaVersion: 1, view: 'nope', cardSize: 9999, enabled: 'yes' })).toMatchObject({
      view: 'grid',
      cardSize: 360,
      enabled: true,
    });
  });
});

describe('yearFromShortDate', () => {
  const now = new Date('2026-11-01');
  it('expands two-digit years', () => {
    expect(yearFromShortDate('09-29-23', now)).toBe(2023);
    expect(yearFromShortDate('04-05-09', now)).toBe(2009);
    expect(yearFromShortDate('04-03-98', now)).toBe(1998);
    expect(yearFromShortDate('??-??-31', now)).toBe(2031);
    expect(yearFromShortDate(undefined, now)).toBeUndefined();
  });
});
