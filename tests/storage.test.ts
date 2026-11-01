import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('saveSettings', () => {
  beforeEach(() => {
    vi.resetModules();
    const data: Record<string, unknown> = {};
    // Async like the real API, so overlapping saves would interleave without the queue.
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: data[key] }),
          set: async (items: Record<string, unknown>) => {
            await new Promise((r) => setTimeout(r, 5));
            Object.assign(data, items);
          },
        },
      },
    });
  });

  it('keeps both changes when two saves overlap', async () => {
    const { saveSettings, loadSettings } = await import('../src/settings/storage');
    await Promise.all([saveSettings({ view: 'wall' }), saveSettings({ cardSize: 140 })]);
    expect(await loadSettings()).toMatchObject({ view: 'wall', cardSize: 140 });
  });
});
