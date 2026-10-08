import { readdir, readFile, writeFile, appendFile } from 'node:fs/promises';
export function summarizeLighthouse(reports) {
  const groups = new Map();
  for (const report of reports) {
    const path = new URL(report.finalUrl).pathname;
    if (!groups.has(path)) groups.set(path, []);
    groups.get(path).push(report);
  }
  const median = (values) => {
    if (values.some((value) => !Number.isFinite(value))) return 'N/A';
    const sorted = values.toSorted((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return Math.round(
      sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    );
  };
  const value = (runs, name, scale = 1) =>
    median(runs.map((run) => run.audits?.[name]?.numericValue * scale));
  return (
    [
      '# AnimeTrack — Lighthouse (medianat)',
      '',
      '| Faqja | Hapje | LCP ms | TBT ms | CLS ×1000 | SEO /100 |',
      '| --- | --- | --- | --- | --- | --- |',
      ...[...groups].map(
        ([path, runs]) =>
          `| ${path} | ${runs.length} | ${value(runs, 'largest-contentful-paint')} | ${value(runs, 'total-blocking-time')} | ${value(runs, 'cumulative-layout-shift', 1000)} | ${median(runs.map((run) => run.categories?.seo?.score * 100))} |`,
      ),
      '',
      'Matje laboratorike mobile. TBT nuk është INP; të dhënat reale kërkojnë trafik të mjaftueshëm në Search Console/CrUX.',
    ].join('\n') + '\n'
  );
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const folder = '.lighthouseci';
  const files = (await readdir(folder)).filter((name) => /^lhr-.*\.json$/.test(name));
  if (!files.length) throw Error('Nuk u gjetën raportet Lighthouse');
  const reports = await Promise.all(
    files.map(async (name) => JSON.parse(await readFile(`${folder}/${name}`, 'utf8'))),
  );
  const summary = summarizeLighthouse(reports);
  await writeFile(`${folder}/summary.md`, summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
}
