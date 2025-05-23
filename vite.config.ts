import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=twitter.com',
        namespace: 'https://github.com/JhouHank/X-Enhance',
        // match: ['https://x.com/*'],
        match: [
          'https://x.com/*',
          'https://twitter.com/*',
          'https://www.google.com/*',
        ],
        description: 'X網站的增強工具',
        version: '1.0.0',
        author: 'JhouHank',
      },
      server: { mountGmApi: true },
    }),
  ],
});
