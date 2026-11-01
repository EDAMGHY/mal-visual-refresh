export const VIEWS = ['grid', 'wall', 'list', 'original'] as const;
export type View = (typeof VIEWS)[number];

export const SIZE_MIN = 110;
export const SIZE_MAX = 360;
export const SIZE_PRESETS = { compact: 140, comfortable: 190, large: 260 } as const;

export type Settings = {
  schemaVersion: 1;
  enabled: boolean;
  view: View;
  /** Card (poster) width in px — the zoom slider. */
  cardSize: number;
  posterFit: 'contain' | 'cover';
  showSynopsis: boolean;
};

export const DEFAULTS: Settings = {
  schemaVersion: 1,
  enabled: true,
  view: 'grid',
  cardSize: SIZE_PRESETS.comfortable,
  posterFit: 'cover',
  showSynopsis: false,
};

/** Accepts anything read from storage; bad or missing fields fall back to defaults. */
export function validate(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (r.schemaVersion !== 1) return { ...DEFAULTS };
  const size = Number(r.cardSize);
  return {
    schemaVersion: 1,
    enabled: typeof r.enabled === 'boolean' ? r.enabled : DEFAULTS.enabled,
    view: VIEWS.includes(r.view as View) ? (r.view as View) : DEFAULTS.view,
    cardSize: Number.isFinite(size)
      ? Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(size)))
      : DEFAULTS.cardSize,
    posterFit: r.posterFit === 'contain' || r.posterFit === 'cover' ? r.posterFit : DEFAULTS.posterFit,
    showSynopsis: typeof r.showSynopsis === 'boolean' ? r.showSynopsis : DEFAULTS.showSynopsis,
  };
}
