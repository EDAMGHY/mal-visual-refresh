import type { Settings } from '../settings/schema';
import { loadSettings, onSettingsChanged, resetSettings, saveSettings } from '../settings/storage';

const enabled = document.getElementById('enabled') as HTMLInputElement;
const view = document.getElementById('view') as HTMLSelectElement;
const posterFit = document.getElementById('posterFit') as HTMLSelectElement;

function show(s: Settings) {
  enabled.checked = s.enabled;
  view.value = s.view;
  posterFit.value = s.posterFit;
}

enabled.addEventListener('change', () => void saveSettings({ enabled: enabled.checked }));
view.addEventListener('change', () => void saveSettings({ view: view.value as Settings['view'] }));
posterFit.addEventListener('change', () =>
  void saveSettings({ posterFit: posterFit.value as Settings['posterFit'] }),
);
document.getElementById('reset')!.addEventListener('click', () => void resetSettings().then(show));

void loadSettings().then(show);
onSettingsChanged(show);
