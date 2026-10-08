import { writeFile } from 'node:fs/promises';
import { inspectPublicSite } from './public-visibility.mjs';
const report = await inspectPublicSite({ origin: process.env.AT_PUBLIC_CHECK_ORIGIN || undefined });
const summary = [
  '# AnimeTrack — Dukshmëria publike',
  '',
  '| Faqja | Kontrolli | Rezultati |',
  '| --- | --- | --- |',
  ...report.checks.map(
    (item) => `| ${item.path} | ${item.check} | ${item.ok ? 'OK' : 'DËSHTOI'} |`,
  ),
  '',
  report.scope,
].join('\n');
await writeFile('public-visibility-report.json', JSON.stringify(report, null, 2) + '\n');
await writeFile('public-visibility-report.md', summary + '\n');
console.log(summary);
if (!report.ok) process.exitCode = 1;
