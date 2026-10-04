import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = 8766;
const page = new URL('./sandbox-checkout.html', import.meta.url);

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' || !['/', '/sandbox-checkout.html'].includes(request.url)) {
    response.writeHead(404).end('Not found');
    return;
  }

  try {
    const html = await readFile(page);
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }).end(html);
  } catch {
    response.writeHead(500).end('Could not load the sandbox test page');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Sandbox checkout test: http://127.0.0.1:${port}/sandbox-checkout.html`);
  console.log('Press Ctrl+C to stop this local server.');
});
