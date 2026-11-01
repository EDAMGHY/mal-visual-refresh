import { routeFor } from '../adapters/routes';
import { loadSettings, onSettingsChanged, saveSettings } from '../settings/storage';
import { createController } from './lifecycle';

async function main() {
  const route = routeFor(location);
  if (!route) return;
  const controller = createController(document, route, (patch) => void saveSettings(patch));
  controller.apply(await loadSettings());
  // Toolbar, popup and other tabs all write to storage; every tab re-applies from there.
  onSettingsChanged((settings) => controller.apply(settings));
}

void main();
