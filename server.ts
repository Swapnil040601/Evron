/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const MEDIAMTX_URL = process.env.MEDIAMTX_URL || 'http://localhost:8888';

// All other API calls → Fastify backend (strips /api prefix)
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  on: {
    error: (_err: any, _req: any, res: any) => {
      if (res && !res.headersSent) res.status(502).json({ error: 'Backend service unavailable' });
    },
  },
} as any));

// HLS video streams → MediaMTX (strips /hls prefix, e.g. /hls/cam_1_live/index.m3u8 → /cam_1_live/index.m3u8)
app.use('/hls', createProxyMiddleware({
  target: MEDIAMTX_URL,
  changeOrigin: true,
  pathRewrite: { '^/hls': '' },
  selfHandleResponse: false,
} as any));

async function serveApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      }
    }));
    app.get('*', (_req: any, res: any) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Evron App running at http://localhost:${PORT}`);
    console.log(`API proxy  → ${BACKEND_URL}`);
    console.log(`HLS proxy  → ${MEDIAMTX_URL}`);
  });
}

serveApp();
