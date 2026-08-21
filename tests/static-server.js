// Minimal zero-dependency static file server used by Playwright's webServer.
// Serves SERVE_DIR (default: repo root) so we can point tests at either the
// current source or the built dist/ over the SAME http pipeline — this avoids
// file://-vs-served rendering drift when comparing visual snapshots.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.env.SERVE_DIR ? normalize(process.env.SERVE_DIR) : process.cwd();
const PORT = Number(process.env.PORT) || 4321;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
    try {
        let path = decodeURIComponent((req.url || '/').split('?')[0]);
        if (path === '/' || path.endsWith('/')) path += 'index.html';
        const filePath = join(ROOT, path);
        // Prevent path traversal outside ROOT.
        if (!normalize(filePath).startsWith(ROOT)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        const body = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`static-server serving ${ROOT} at http://localhost:${PORT}`);
});
