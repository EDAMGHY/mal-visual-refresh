import { DEFAULTS, validate, type Settings } from './schema';

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(KEY);
  return validate(stored[KEY]);
}

// Saves are read-modify-write, so two quick toolbar clicks would otherwise both read the
// old settings and the second write would undo the first. Run them one at a time.
let pending: Promise<unknown> = Promise.resolve();

export function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const run = pending.then(async () => {
    const next = validate({ ...(await loadSettings()), ...patch });
    await chrome.storage.local.set({ [KEY]: next });
    return next;
  });
  pending = run.catch(() => undefined);
  return run;
}

export async function resetSettings(): Promise<Settings> {
  await chrome.storage.local.set({ [KEY]: DEFAULTS });
  return { ...DEFAULTS };
}

export function onSettingsChanged(listener: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && KEY in changes) listener(validate(changes[KEY].newValue));
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
