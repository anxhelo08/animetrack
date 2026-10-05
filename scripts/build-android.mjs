import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const key of ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD']) {
  if (!process.env[key]) throw new Error(`Set ${key} before building a signed Android release.`);
}
if (!existsSync(process.env.ANDROID_KEYSTORE_PATH))
  throw new Error('The release signing key was not found.');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('Set ANDROID_HOME to your Android SDK directory.');
const tools = path.join(sdk, 'build-tools', '36.0.0');
const gradle =
  process.env.GRADLE_EXECUTABLE ||
  path.join(root, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
execFileSync(gradle, ['--no-daemon', ':app:assembleRelease'], {
  cwd: path.join(root, 'android'),
  stdio: 'inherit',
});
const apk = path.join(root, 'android/app/build/outputs/apk/release/app-release.apk');
execFileSync(path.join(tools, 'zipalign'), ['-c', '-p', '4', apk], { stdio: 'inherit' });
const signature = execFileSync(
  path.join(tools, 'apksigner'),
  ['verify', '--verbose', '--print-certs', apk],
  { encoding: 'utf8' },
);
const digest = signature
  .match(/Signer #1 certificate SHA-256 digest: ([a-f0-9]+)/i)?.[1]
  ?.toUpperCase();
const fingerprint = digest?.match(/.{2}/g)?.join(':');
const associations = JSON.parse(
  readFileSync(path.join(root, 'public/.well-known/assetlinks.json'), 'utf8'),
);
if (
  !fingerprint ||
  !associations.some(
    (entry) =>
      entry.target?.package_name === 'com.animetrack.app' &&
      entry.target.sha256_cert_fingerprints?.includes(fingerprint),
  )
) {
  throw new Error(
    'The APK signer does not match the public Android domain association. Nothing was published.',
  );
}
const badging = execFileSync(path.join(tools, 'aapt'), ['dump', 'badging', apk], {
  encoding: 'utf8',
});
const name = badging.match(/package: name='([^']+)'/)?.[1];
const version = badging.match(/versionName='([^']+)'/)?.[1];
const versionCode = Number(badging.match(/versionCode='(\d+)'/)?.[1]);
if (
  name !== 'com.animetrack.app' ||
  !version ||
  !versionCode ||
  /application-debuggable/.test(badging)
) {
  throw new Error('Expected a non-debuggable AnimeTrack release APK.');
}
const bytes = readFileSync(apk);
const downloads = path.join(root, 'public/downloads');
mkdirSync(downloads, { recursive: true });
copyFileSync(apk, path.join(downloads, 'AnimeTrack.apk'));
writeFileSync(
  path.join(downloads, 'android.json'),
  JSON.stringify(
    {
      version,
      versionCode,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      minAndroid: '8.0',
      appId: name,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Published verified AnimeTrack ${version} APK (${bytes.length} bytes). Private signing keys were not copied.`,
);
