import news from '../api/news.js';
import newsImage from '../api/news-image.js';
import weebcentral from '../api/weebcentral.js';

// Use the same handler locally as on Vercel, rather than returning the SPA HTML for /api/news.
function middleware(req, res, next) {
  const path = req.url?.split('?')[0];
  const handler =
    path === '/api/news'
      ? news
      : path === '/api/news-image'
        ? newsImage
        : path === '/api/weebcentral'
          ? weebcentral
          : null;
  if (!handler) return next();
  const response = {
    setHeader: (name, value) => res.setHeader(name, value),
    status(code) {
      res.statusCode = code;
      return response;
    },
    json(value) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(value));
      return response;
    },
    end() {
      res.end();
      return response;
    },
  };
  void handler(req, response).catch(() => {
    if (!res.writableEnded) response.status(502).json({ error: 'News temporarily unavailable' });
  });
}
export function newsAPI() {
  return {
    name: 'animetrack-news-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
