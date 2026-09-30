import fs from 'node:fs';

// Legacy wiring assertions span the controller and its extracted modules.
// Runtime behavior is exercised by model/store tests and browser flows.
export function readCoreSource() {
  return ['app.js', 'core/library-model.js', 'core/catalog-client.js']
    .map((file) =>
      fs
        .readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8')
        .replace(/^export /gm, ''),
    )
    .join('\n');
}
