import {designSystemCSS} from './src/design-system.mjs';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import {readFileSync} from 'node:fs';
const headers=Object.fromEntries(JSON.parse(readFileSync(new URL('./vercel.json',import.meta.url),'utf8')).headers[0].headers.map(({key,value})=>[key,value.replace('; upgrade-insecure-requests','')]));

export default defineConfig({
  publicDir:'public',
  css:{postcss:{plugins:[designSystemCSS()]}},
  preview:{headers},
  plugins:[
    VitePWA({
      strategies:'injectManifest',
      srcDir:'src',
      filename:'sw.js',
      injectRegister:false,
      registerType:'prompt',
      manifest:false,
      injectManifest:{
        globPatterns:['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        globIgnores:['**/screenshot-*.png'],
        maximumFileSizeToCacheInBytes:4*1024*1024
      }
    })
  ],
  build:{
    outDir:'dist',
    cssTarget:['chrome123','safari17.5','firefox120'],
    emptyOutDir:true,
    sourcemap:false,
    rolldownOptions:{
      output:{
        entryFileNames:'assets/[name].[hash].js',
        chunkFileNames:'assets/[name].[hash].js',
        assetFileNames:'assets/[name].[hash][extname]'
      }
    }
  }
});
