import './src/shim.server';
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Serve static files from /browser
  server.use(express.static(browserDistFolder, {
    maxAge: '1y',
    index: false
  }));

  const ssrCache = new Map<string, { html: string, timestamp: number }>();
  const CACHE_TTL_MS = 1000 * 60 * 15; // 15 mins cache TTL

  // Handle SSR for dynamic routes including /celular
  server.get(/.*/, (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    
    const cacheKey = originalUrl;
    const isCacheable = originalUrl === '/' || originalUrl.startsWith('/inicio') || originalUrl.startsWith('/celular');

    if (isCacheable) {
       res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400'); 
       
       const cached = ssrCache.get(cacheKey);
       if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          res.send(cached.html);
          return;
       }
    }

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html: string) => {
        if (isCacheable) {
           ssrCache.set(cacheKey, { html, timestamp: Date.now() });
        }
        res.send(html)
      })
      .catch((err: unknown) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
