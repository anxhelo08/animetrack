import { expect, it } from 'vitest';
import { startupAssets, startupStyles } from '../../scripts/startup-assets.mjs';

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

it('counts eager CSS once across dependencies while leaving unopened page styles optional', () => {
  const manifest = {
    entry: {
      file: 'entry.js',
      css: ['shell.css'],
      imports: ['shared'],
      dynamicImports: ['reading'],
    },
    controller: { file: 'controller.js', css: ['cards.css'], imports: ['shared'] },
    shared: { file: 'shared.js', css: ['shell.css'] },
    reading: { file: 'reading.js', css: ['reading.css'] },
  };
  expect(startupStyles(manifest, ['entry', 'controller'])).toEqual(['shell.css', 'cards.css']);
  expect(() => startupStyles({}, ['entry'])).toThrow('Startup manifest entry missing: entry');
});
