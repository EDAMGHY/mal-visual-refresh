import type { Route } from '../adapters/routes';
import type { ListingPage } from '../adapters/types';
import type { Settings } from '../settings/schema';
import { renderCards } from '../ui/cards';
import { h } from '../ui/dom';
import { createFullView, type FullView } from '../ui/fullview';
import { renderToolbar, type Toolbar } from '../ui/toolbar';

const ROOT_ID = 'malvr-root';
const HIDDEN = 'malvr-native-hidden';

type Mounted = {
  page: ListingPage;
  root: HTMLElement;
  toolbar: Toolbar;
  list: HTMLElement;
  fullView: FullView;
};

export type Controller = {
  apply(settings: Settings): void;
  teardown(): void;
};

/**
 * Builds the grid next to MAL's results/ranking table and only then hides the table.
 * Nothing native is removed: pagination, tabs, search form and the table itself stay in the page.
 */
export function createController(
  doc: Document,
  route: Route,
  save: (patch: Partial<Settings>) => void,
): Controller {
  let mounted: Mounted | null = null;

  const mount = (settings: Settings): Mounted | null => {
    const parsed = route.parse(doc);
    if (!parsed.ok) {
      console.info(`[MAL Visual Refresh] native view kept: ${parsed.reason}`);
      return null;
    }
    const { page } = parsed;
    const addLabels = new Map(
      [...page.addButtons].map(([id, a]) => [id, a.textContent?.trim() || 'add'] as [number, string]),
    );
    const clickNativeAdd = (id: number) => page.addButtons.get(id)?.click();

    const toolbar = renderToolbar(page.sortLinks, page.cards.some((c) => c.synopsis), save);
    const list = renderCards(page.cards, addLabels, `${settings.cardSize}px`, `${page.kind} results`);
    const fullView = createFullView(page.cards, addLabels, clickNativeAdd);
    list.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const open = target.closest<HTMLElement>('[data-malvr-open]')?.dataset.malvrOpen;
      if (open !== undefined) fullView.open(Number(open));
      const add = target.closest<HTMLElement>('[data-malvr-add]')?.dataset.malvrAdd;
      if (add !== undefined) clickNativeAdd(Number(add));
    });

    // Built detached, inserted in one step, before the native table is hidden.
    const root = h('div', { id: ROOT_ID }, toolbar.el, list);
    page.table.before(root);
    return { page, root, toolbar, list, fullView };
  };

  const teardown = () => {
    if (!mounted) return;
    mounted.fullView.destroy();
    mounted.root.remove();
    mounted.page.table.classList.remove(HIDDEN);
    mounted = null;
  };

  return {
    apply(settings) {
      try {
        if (!settings.enabled) return teardown();
        // Stale mount (e.g. the table was replaced): rebuild from scratch.
        if (mounted && !mounted.page.table.isConnected) teardown();
        mounted ??= mount(settings);
        if (!mounted) return;

        const { root, toolbar, list, page } = mounted;
        const grid = settings.view !== 'original';
        toolbar.sync(settings);
        root.dataset.view = settings.view;
        root.dataset.fit = settings.posterFit;
        root.dataset.synopsis = String(settings.showSynopsis);
        root.style.setProperty('--malvr-size', `${settings.cardSize}px`);
        list.hidden = !grid;
        page.table.classList.toggle(HIDDEN, grid);
        for (const img of list.querySelectorAll('img[sizes]')) {
          img.setAttribute('sizes', `${settings.cardSize}px`);
        }
        if (!grid) mounted.fullView.close();
      } catch (err) {
        console.error('[MAL Visual Refresh] failed, restoring native view', err);
        teardown();
      }
    },
    teardown,
  };
}
