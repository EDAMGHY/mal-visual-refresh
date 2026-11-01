import type { PosterSources } from './types';

const CDN = 'cdn.myanimelist.net';

// Listing thumbnails look like https://cdn.myanimelist.net/r/50x70/images/anime/1015/138006.webp?s=…
// Dropping the /r/WxH resize prefix (and its signature) gives MAL's full image (~225x318);
// an "l" suffix gives the large one (~425x600). Verified for anime and manga against the live CDN on 1 Nov 2026.
const RESIZED = /^\/r\/\d+x\d+(\/images\/(?:anime|manga)\/\d+\/\d+)\.(webp|jpe?g)$/;

function safeCdnUrl(raw: string | null | undefined): URL | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw, 'https://myanimelist.net');
    return url.protocol === 'https:' && url.hostname === CDN ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Picks the 2x entry from a srcset, else the first one. */
function pickFromSrcset(srcset: string | null): string | undefined {
  if (!srcset) return undefined;
  const entries = srcset.split(',').map((s) => s.trim().split(/\s+/));
  return (entries.find(([, d]) => d === '2x') ?? entries[0])?.[0];
}

export function posterSources(img: HTMLImageElement | null): PosterSources {
  if (!img) return {};
  // MAL lazy-loads with lazysizes, so data-* is present before the image ever scrolls into view.
  const thumbUrl =
    safeCdnUrl(pickFromSrcset(img.getAttribute('data-srcset') ?? img.getAttribute('srcset'))) ??
    safeCdnUrl(img.getAttribute('data-src') ?? img.getAttribute('src'));
  if (!thumbUrl || thumbUrl.pathname.includes('/images/qm_')) return {};

  const sources: PosterSources = { thumb: thumbUrl.href };
  const match = RESIZED.exec(thumbUrl.pathname);
  if (match) {
    const [, path, ext] = match;
    sources.medium = `https://${CDN}${path}.${ext}`;
    sources.large = `https://${CDN}${path}l.${ext}`;
  }
  return sources;
}
