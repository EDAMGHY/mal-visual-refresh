import type { MediaCard } from '../adapters/types';
import { metaParts, rankBadge, scoreBadge } from './cards';
import { fmtInt, h } from './dom';
import { posterImage } from './poster';

export type FullView = {
  open(index: number): void;
  close(): void;
  destroy(): void;
};

/**
 * Modal "full view": large poster plus everything the search row knows about the anime.
 * ←/→ step through results, Z (or clicking the poster) toggles poster-only zoom, Esc closes.
 */
export function createFullView(
  cards: MediaCard[],
  addLabels: Map<number, string>,
  onAdd: (id: number) => void,
): FullView {
  const dialog = h('dialog', { id: 'malvr-full', class: 'malvr-full', 'aria-label': 'Full view' });
  let index = 0;
  let returnFocus: HTMLElement | null = null;

  const render = () => {
    const card = cards[index];
    const meta = metaParts(card);
    const details: [string, string][] = [];
    if (card.rated) details.push(['Rated', card.rated]);
    if (card.members !== undefined) details.push(['Members', fmtInt(card.members)]);
    if (card.startDate) {
      // An open end on MAL means "not finished / unknown", so it is shown as "?" rather than dropped.
      details.push([card.kind === 'anime' ? 'Aired' : 'Published', `${card.startDate} → ${card.endDate ?? '?'}`]);
    }
    const addLabel = addLabels.get(card.id);

    dialog.replaceChildren(
      h(
        'button',
        { type: 'button', class: 'malvr-full-poster', 'data-act': 'zoom', 'aria-label': 'Zoom poster (Z)' },
        posterImage(card, { sizes: '425px', eager: true, preferLarge: true }),
      ),
      h(
        'div',
        { class: 'malvr-full-info' },
        h('div', { class: 'malvr-full-count' }, `${index + 1} / ${cards.length}`),
        h('h2', { class: 'malvr-full-title' }, h('a', { href: card.url }, card.title)),
        h('div', { class: 'malvr-full-meta' }, rankBadge(card), scoreBadge(card), meta.length > 0 && h('span', {}, meta.join(' · '))),
        details.length > 0 &&
          h('dl', { class: 'malvr-full-details' }, ...details.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
        card.synopsis && h('p', { class: 'malvr-full-synopsis' }, card.synopsis),
        h(
          'div',
          { class: 'malvr-full-actions' },
          h('a', { class: 'malvr-btn malvr-btn-primary', href: card.url }, 'Open on MAL'),
          addLabel && h('button', { type: 'button', class: 'malvr-btn', 'data-act': 'add' }, addLabel),
        ),
        h('p', { class: 'malvr-full-keys' }, '← → browse · Z zoom · Esc close'),
      ),
      h('button', { type: 'button', class: 'malvr-full-nav malvr-prev', 'data-act': 'prev', 'aria-label': 'Previous' }, '‹'),
      h('button', { type: 'button', class: 'malvr-full-nav malvr-next', 'data-act': 'next', 'aria-label': 'Next' }, '›'),
      h('button', { type: 'button', class: 'malvr-full-close', 'data-act': 'close', 'aria-label': 'Close' }, '×'),
    );
    // Warm the neighbours so stepping through feels instant.
    for (const n of [cards[index + 1], cards[index - 1]]) {
      if (n?.poster.large) new Image().src = n.poster.large;
    }
  };

  const go = (delta: number) => {
    index = (index + delta + cards.length) % cards.length;
    dialog.classList.remove('malvr-zoomed');
    // Re-rendering replaces the buttons, so put focus back on the equivalent one.
    const act = (document.activeElement as HTMLElement | null)?.dataset?.act ?? 'close';
    render();
    dialog.querySelector<HTMLElement>(`[data-act="${act}"]`)?.focus();
  };

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) return close(); // backdrop
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'prev') go(-1);
    else if (act === 'next') go(1);
    else if (act === 'close') close();
    else if (act === 'zoom') dialog.classList.toggle('malvr-zoomed');
    else if (act === 'add') {
      const id = cards[index].id;
      close();
      onAdd(id);
    }
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'z' || e.key === 'Z') dialog.classList.toggle('malvr-zoomed');
    else return;
    e.preventDefault();
  });
  dialog.addEventListener('close', () => {
    dialog.classList.remove('malvr-zoomed');
    returnFocus?.focus();
  });

  function close() {
    if (dialog.open) dialog.close();
  }

  document.body.append(dialog);

  return {
    open(i) {
      returnFocus = document.activeElement as HTMLElement | null;
      index = i;
      render();
      if (!dialog.open) dialog.showModal();
      dialog.querySelector<HTMLElement>('.malvr-full-close')?.focus();
    },
    close,
    destroy() {
      close();
      dialog.remove();
    },
  };
}
