import {defineConfig} from 'vite';
export default defineConfig({
  publicDir:'public',
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
