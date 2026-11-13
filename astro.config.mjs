import { defineConfig } from 'astro/config';

// One static page. All CSS is inlined so the first paint needs one request.
// The fonts are declared in src/lib/fonts.ts.
export default defineConfig({
  output: 'static',
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
