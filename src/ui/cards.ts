import type { MediaCard } from '../adapters/types';
import { fmtInt, h } from './dom';
import { posterImage } from './poster';

const count = (n: number, one: string, many: string) => `${fmtInt(n)} ${n === 1 ? one : many}`;

export function metaParts(card: MediaCard): string[] {
  const parts: string[] = [];
  if (card.format) parts.push(card.format);
  if (card.episodes !== undefined) parts.push(count(card.episodes, 'ep', 'eps'));
  if (card.volumes !== undefined) parts.push(count(card.volumes, 'vol', 'vols'));
  if (card.chapters !== undefined) parts.push(count(card.chapters, 'ch', 'chs'));
  if (card.year) parts.push(String(card.year));
  return parts;
}

export function rankBadge(card: MediaCard): HTMLElement | null {
  if (card.rank === undefined) return null;
  const tier = (['gold', 'silver', 'bronze'] as const)[card.rank - 1] ?? (card.rank <= 10 ? 'top10' : 'other');
  return h(
    'span',
    { class: 'malvr-rank', 'data-tier': tier, 'aria-label': `Rank ${card.rank}` },
    h('span', { class: 'malvr-rank-hash', 'aria-hidden': 'true' }, '#'),
    fmtInt(card.rank),
  );
}

export function scoreBadge(card: MediaCard): HTMLElement | null {
  if (card.score === undefined) return null;
  return h(
    'span',
    { class: 'malvr-score', 'aria-label': `Score ${card.score.toFixed(2)}` },
    h('span', { 'aria-hidden': 'true' }, '★ '),
    card.score.toFixed(2),
  );
}

function renderCard(card: MediaCard, index: number, addLabel: string | undefined, sizes: string): HTMLLIElement {
  const meta = metaParts(card);
  return h(
    'li',
    { class: 'malvr-card' },
    h(
      'button',
      {
        type: 'button',
        class: 'malvr-poster-btn',
        'data-malvr-open': index,
        'aria-label': `Full view: ${card.title}`,
      },
      posterImage(card, { sizes, eager: index < 12 }),
      scoreBadge(card),
      rankBadge(card),
    ),
    h(
      'div',
      { class: 'malvr-body' },
      h('a', { class: 'malvr-title', href: card.url, title: card.title }, card.title),
      meta.length > 0 && h('div', { class: 'malvr-meta' }, meta.join(' · ')),
      card.members !== undefined && h('div', { class: 'malvr-members' }, `${fmtInt(card.members)} members`),
      card.synopsis && h('p', { class: 'malvr-synopsis' }, card.synopsis),
      addLabel &&
        h(
          'button',
          { type: 'button', class: 'malvr-add', 'data-malvr-add': card.id, 'aria-label': `${addLabel}: ${card.title}` },
          addLabel,
        ),
    ),
  );
}

export function renderCards(
  cards: MediaCard[],
  addLabels: Map<number, string>,
  sizes: string,
  label: string,
): HTMLUListElement {
  const list = h('ul', { class: 'malvr-cards', 'aria-label': label });
  cards.forEach((card, i) => list.append(renderCard(card, i, addLabels.get(card.id), sizes)));
  return list;
}
