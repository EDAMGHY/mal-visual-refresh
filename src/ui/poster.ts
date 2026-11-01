import type { MediaCard } from '../adapters/types';
import { h } from './dom';

/**
 * Poster <img> with a fallback chain: CDN full/large → MAL's own 2x thumbnail → placeholder.
 * The frame reserves its size in CSS, so nothing shifts while images load.
 */
export function posterImage(
  card: MediaCard,
  opts: { sizes: string; eager?: boolean; preferLarge?: boolean },
): HTMLElement {
  const { thumb, medium, large } = card.poster;
  const frame = h('span', { class: 'malvr-poster' });

  const showPlaceholder = () => {
    frame.replaceChildren(h('span', { class: 'malvr-poster-missing', 'aria-hidden': 'true' }, 'No image'));
  };
  if (!thumb) {
    showPlaceholder();
    return frame;
  }

  const img = h('img', {
    alt: '',
    decoding: 'async',
    loading: opts.eager ? 'eager' : 'lazy',
    draggable: 'false',
  });
  if (medium && large) {
    img.srcset = opts.preferLarge ? `${large} 425w` : `${medium} 225w, ${large} 425w`;
    img.sizes = opts.sizes;
    img.src = opts.preferLarge ? large : medium;
  } else {
    img.src = thumb;
  }
  img.addEventListener('error', () => {
    if (img.getAttribute('src') !== thumb) {
      img.removeAttribute('srcset');
      img.src = thumb;
    } else {
      showPlaceholder();
    }
  });
  frame.append(img);
  return frame;
}
