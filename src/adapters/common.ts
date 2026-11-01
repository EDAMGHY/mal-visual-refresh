import type { MediaKind } from './types';

/** Collapses whitespace; MAL's "-", "?" and "N/A" placeholders become undefined. */
export function clean(text: string | null | undefined): string | undefined {
  const t = text?.replace(/\s+/g, ' ').trim();
  return t && t !== '-' && t !== '?' && t.toUpperCase() !== 'N/A' ? t : undefined;
}

export function toNumber(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Validates an entry link against https://myanimelist.net/<kind>/<id>/… */
export function mediaLink(href: string | null, kind: MediaKind): { id: number; url: string } | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href, 'https://myanimelist.net');
    const match = new RegExp(`^/${kind}/(\\d+)(/|$)`).exec(url.pathname);
    if (url.protocol !== 'https:' || url.hostname !== 'myanimelist.net' || !match) return undefined;
    return { id: Number(match[1]), url: url.href };
  } catch {
    return undefined;
  }
}

/** Search dates are MM-DD-YY (parts may be "??"); returns a four-digit year when present. */
export function yearFromShortDate(date: string | undefined, now = new Date()): number | undefined {
  const yy = date?.match(/-(\d{2})$/)?.[1];
  if (!yy) return undefined;
  const n = Number(yy);
  return n <= (now.getFullYear() % 100) + 5 ? 2000 + n : 1900 + n;
}
