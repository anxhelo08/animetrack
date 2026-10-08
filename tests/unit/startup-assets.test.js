import { expect, it } from 'vitest';
import { startupAssets } from '../../scripts/startup-assets.mjs';

it('counts shared startup dependencies once and excludes unopened feature imports', () => {
  const manifest = {
    entry: { file: 'assets/entry.js', imports: ['shared'], dynamicImports: ['reading'] },
    controller: { file: 'assets/controller.js', imports: ['shared'] },
    shared: { file: 'assets/shared.js', imports: ['entry'] },
    reading: { file: 'assets/reading.js' },
  };
  expect(startupAssets(manifest, ['entry', 'controller'])).toEqual([
    'assets/entry.js',
    'assets/shared.js',
    'assets/controller.js',
  ]);
});
it('fails clearly when a required startup import is missing from the build', () => {
  expect(() => startupAssets({}, ['controller'])).toThrow(
    'Startup manifest entry missing: controller',
  );
});
