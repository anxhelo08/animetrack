import news from '../api/news.js';

// Use the same handler locally as on Vercel, rather than returning the SPA HTML for /api/news.
function middleware(req, res, next) {
  if (req.url?.split('?')[0] !== '/api/news') return next();
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
  };
  void news(req, response).catch(() => {
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
