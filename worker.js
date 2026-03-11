/**
 * Worker that serves static assets. Always returns a Response (never null).
 */
export default {
  async fetch(request, env) {
    if (!env.ASSETS) {
      return new Response('Assets not configured', { status: 503 });
    }
    try {
      let response = await env.ASSETS.fetch(request);
      if (!response || response.status === 404) {
        const url = new URL(request.url);
        if (url.pathname === '/' || !url.pathname.includes('.')) {
          const indexUrl = new URL(request.url);
          indexUrl.pathname = '/index.html';
          response = await env.ASSETS.fetch(new Request(indexUrl, request));
        }
      }
      if (response && response instanceof Response && response.status !== 404) return response;
      return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    } catch (e) {
      return new Response('Error: ' + (e && e.message ? e.message : 'Unknown'), {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
};
