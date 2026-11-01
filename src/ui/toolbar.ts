import type { SortLink } from '../adapters/types';
import { SIZE_MAX, SIZE_MIN, SIZE_PRESETS, type Settings, type View } from '../settings/schema';
import { h } from './dom';

const VIEW_LABELS: Record<View, string> = {
  grid: 'Grid',
  wall: 'Posters',
  list: 'List',
  original: 'Original',
};

const PRESET_LABELS: [keyof typeof SIZE_PRESETS, string][] = [
  ['compact', 'S'],
  ['comfortable', 'M'],
  ['large', 'L'],
];

export type Toolbar = { el: HTMLElement; sync(settings: Settings): void };

export function renderToolbar(
  sortLinks: SortLink[],
  hasSynopsis: boolean,
  onChange: (patch: Partial<Settings>) => void,
): Toolbar {
  const viewButtons = (Object.keys(VIEW_LABELS) as View[]).map((view) =>
    h('button', { type: 'button', class: 'malvr-seg', 'data-view': view }, VIEW_LABELS[view]),
  );
  const viewGroup = h('div', { class: 'malvr-group', role: 'group', 'aria-label': 'Layout' }, ...viewButtons);
  viewGroup.addEventListener('click', (e) => {
    const view = (e.target as HTMLElement).closest<HTMLElement>('[data-view]')?.dataset.view as View | undefined;
    if (view) onChange({ view });
  });

  const slider = h('input', {
    type: 'range',
    min: SIZE_MIN,
    max: SIZE_MAX,
    step: 10,
    class: 'malvr-slider',
    'aria-label': 'Poster size',
  });
  slider.addEventListener('input', () => onChange({ cardSize: Number(slider.value) }));
  const step = (delta: number) => () => onChange({ cardSize: Number(slider.value) + delta });
  const sizeGroup = h(
    'div',
    { class: 'malvr-group malvr-size', role: 'group', 'aria-label': 'Poster size' },
    h('button', { type: 'button', class: 'malvr-icon', 'aria-label': 'Smaller posters', 'data-step': '-' }, '−'),
    slider,
    h('button', { type: 'button', class: 'malvr-icon', 'aria-label': 'Bigger posters', 'data-step': '+' }, '+'),
    ...PRESET_LABELS.map(([name, short]) =>
      h(
        'button',
        { type: 'button', class: 'malvr-seg malvr-preset', 'data-size': SIZE_PRESETS[name], title: name, 'aria-label': `${name} size` },
        short,
      ),
    ),
  );
  sizeGroup.querySelector('[data-step="-"]')!.addEventListener('click', step(-20));
  sizeGroup.querySelector('[data-step="+"]')!.addEventListener('click', step(20));
  sizeGroup.addEventListener('click', (e) => {
    const size = (e.target as HTMLElement).closest<HTMLElement>('[data-size]')?.dataset.size;
    if (size) onChange({ cardSize: Number(size) });
  });

  const fit = h('button', { type: 'button', class: 'malvr-seg', 'aria-pressed': 'false' }, 'Fit whole poster');
  fit.addEventListener('click', () => onChange({ posterFit: fit.getAttribute('aria-pressed') === 'true' ? 'cover' : 'contain' }));

  const synopsis = h('button', { type: 'button', class: 'malvr-seg', 'aria-pressed': 'false' }, 'Synopsis');
  synopsis.addEventListener('click', () => onChange({ showSynopsis: synopsis.getAttribute('aria-pressed') !== 'true' }));

  let sort: HTMLElement | false = false;
  if (sortLinks.length > 0) {
    const select = h(
      'select',
      { class: 'malvr-select', 'aria-label': 'Sort results (reloads the page)' },
      h('option', { value: '' }, 'Sort by…'),
      ...sortLinks.map((link) => h('option', { value: link.href }, link.label)),
    );
    // MAL performs the sort; we only navigate to the same link its header would.
    select.addEventListener('change', () => {
      if (select.value) location.assign(select.value);
    });
    sort = select;
  }

  const el = h(
    'div',
    { class: 'malvr-toolbar', role: 'toolbar', 'aria-label': 'MAL Visual Refresh' },
    viewGroup,
    h('div', { class: 'malvr-grid-only malvr-group' }, sizeGroup),
    h('div', { class: 'malvr-grid-only malvr-group' }, fit, hasSynopsis && synopsis),
    sort,
    h('span', { class: 'malvr-hint malvr-grid-only' }, 'Click a poster for full view'),
  );

  return {
    el,
    sync(settings) {
      el.dataset.view = settings.view;
      for (const b of viewButtons) b.setAttribute('aria-pressed', String(b.dataset.view === settings.view));
      slider.value = String(settings.cardSize);
      for (const b of sizeGroup.querySelectorAll<HTMLElement>('[data-size]')) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.size) === settings.cardSize));
      }
      fit.setAttribute('aria-pressed', String(settings.posterFit === 'contain'));
      synopsis.setAttribute('aria-pressed', String(settings.showSynopsis));
    },
  };
}
