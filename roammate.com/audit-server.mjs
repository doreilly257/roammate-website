// Tiny Node server: serves static files + proxies Unsplash search
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8766;
const MIME = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Unsplash search proxy
  if (url.pathname === '/api/search') {
    const q = url.searchParams.get('q');
    const page = url.searchParams.get('page') || '1';
    if (!q) { res.writeHead(400); res.end('missing q'); return; }
    try {
      const apiUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=30&page=${page}`;
      const r = await fetch(apiUrl, { headers: { 'Accept':'application/json', 'User-Agent':'Mozilla/5.0' } });
      const data = await r.json();
      const results = (data.results || [])
        .filter(p => !p.urls.raw.includes('premium_photo'))
        .map(p => {
          const m = p.urls.raw.match(/photo-([^?]+)/);
          return { id: m ? m[1] : null, thumb: p.urls.small, desc: p.alt_description || p.description || '' };
        })
        .filter(p => p.id);
      res.writeHead(200, { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' });
      res.end(JSON.stringify(results));
    } catch(e) { res.writeHead(500); res.end(e.message); }
    return;
  }

  // Static files
  let filePath = '.' + decodeURIComponent(url.pathname);
  if (filePath === './') filePath = './audit-blog-images.html';
  const ext = path.extname(filePath);
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch(e) {
    res.writeHead(404);
    res.end('Not found: ' + filePath);
  }
}).listen(PORT, () => console.log(`Audit server at http://localhost:${PORT}`));
