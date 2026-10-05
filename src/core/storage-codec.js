import LZString from 'lz-string';
const PREFIX = 'ATLS1:';
/** Lossless encoding applies only to library data, never credentials or settings. */
export function encodeLibraryStorage(value) {
  const encoded = PREFIX + LZString.compressToUTF16(value);
  return encoded.length < value.length ? encoded : value;
}
export function decodeLibraryStorage(value) {
  if (value === null || !value.startsWith(PREFIX)) return value;
  const decoded = LZString.decompressFromUTF16(value.slice(PREFIX.length));
  if (decoded === null || encodeLibraryStorage(decoded) !== value)
    throw Error('Kopja lokale e kompresuar nuk kaloi verifikimin.');
  return decoded;
}
