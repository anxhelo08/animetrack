import { createIndexedLibrary } from './indexed-library.js';
const legacy = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
  key: (i) => window.localStorage.key(i),
  get length() {
    return window.localStorage.length;
  },
};
let database = null;
try {
  database = window.indexedDB;
} catch {}
export const libraryRepository = createIndexedLibrary(legacy, { indexedDB: database });
export const libraryStorage = libraryRepository.storage;
