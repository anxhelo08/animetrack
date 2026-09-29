import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
  publicDir:'public',
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
        maximumFileSizeToCacheInBytes:4*1024*1024
      }
    })
  ],
  build:{
    outDir:'dist',
    emptyOutDir:true,
    sourcemap:false,
    rollupOptions:{
      output:{
        entryFileNames:'assets/[name].[hash].js',
        chunkFileNames:'assets/[name].[hash].js',
        assetFileNames:'assets/[name].[hash][extname]'
      }
    }
  }
});
