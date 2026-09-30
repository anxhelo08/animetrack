import { createTheme } from './theme.js';
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem: () => null,
    setItem: () => {
      throw Error('Storage unavailable');
    },
  };
}
export const theme = createTheme({
  storage,
  document,
  media: matchMedia('(prefers-color-scheme: dark)'),
});
