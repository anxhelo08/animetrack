import {test} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
import {fileURLToPath} from 'node:url';
const __filename=fileURLToPath(import.meta.url),__dirname=require('node:path').dirname(__filename);
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]):[];

test('13.1.a uses Vite source/dist architecture and content hashes',()=>{
 const pkg=JSON.parse(read('package.json')),vite=read('vite.config.mjs'),html=read('index.html'),main=read('src/main.js');
 assert.equal(pkg.version,'13.5.2');assert.equal(pkg.releaseLabel,'13.5.2');assert.equal(pkg.devDependencies.vite,'8.3.1');
 assert.match(vite,/outDir:'dist'/);assert.match(vite,/\[name\]\.\[hash\]\.js/);assert.match(vite,/\[name\]\.\[hash\]\[extname\]/);
 assert.match(html,/type="module" src="\/src\/main\.js"/);assert.doesNotMatch(html,/\/assets\/pro-/);
 assert.match(main,/import "\.\/styles\/index\.css"/);assert.match(main,/import\("\.\/modules\/movies\.js"\)/);assert.match(main,/import\("\.\/app\.js"\)/);
 assert.equal(fs.existsSync(path.join(root,'assets')),false);assert.equal(fs.existsSync(path.join(root,'dist')),false);
});

test('13.1.a source filenames no longer embed release numbers',()=>{
 const list=walk(path.join(root,'src')).map(p=>path.relative(path.join(root,'src'),p).replaceAll('\\','/'));
 for(const file of list)assert.doesNotMatch(file,/(?:^|\/)pro-[^/]*\d{3,}[^/]*\.(?:js|css)$/i,file);
});

test('13.1.a has one changelog and no active Base64 release patch system',()=>{
 assert.equal(fs.existsSync(path.join(root,'CHANGELOG.md')),true);assert.match(read('CHANGELOG.md'),/Keep a Changelog/);assert.match(read('CHANGELOG.md'),/\[13\.1\.1\]/);
 assert.equal(fs.existsSync(path.join(root,'.release')),false);assert.deepEqual(fs.readdirSync(root).filter(n=>/^RELEASE_.*\.md$/.test(n)),[]);
});

test('13.1.a standardizes browser E2E on Playwright Test',()=>{
 const e2e=walk(path.join(root,'tests/e2e')).map(p=>path.relative(root,p));assert.ok(e2e.length>=3);assert.ok(e2e.every(p=>p.endsWith('.spec.js')));assert.equal(walk(path.join(root,'tests')).some(p=>p.endsWith('.py')),false);
 const cfg=read('playwright.config.js');for(const project of ['desktop-chromium','iphone-chromium','iphone-webkit'])assert.match(cfg,new RegExp(project));
});

test('13.1.a keeps GitHub Actions focused and service worker hash-friendly',()=>{
 const workflows=walk(path.join(root,'.github/workflows')).filter(p=>/\.ya?ml$/.test(p));assert.equal(workflows.length,2);assert.ok(workflows.some(p=>p.endsWith('ci.yml')));assert.ok(workflows.some(p=>p.endsWith('generate-ios-icons.yml')));
 const sw=read('public/sw.js');assert.match(sw,/url\.pathname\.startsWith\('\/assets\/'\)/);assert.doesNotMatch(sw,/pro-[a-z-]+-\d+\.js/);
});
