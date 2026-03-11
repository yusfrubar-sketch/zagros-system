/**
 * Minimal Worker that serves static assets from the ASSETS binding.
 * Ensures we always return a Response (fixes "Returned response is null" on custom domains).
 */
export default {
  async fetch(request, env) {
    try {
      const response = await env.ASSETS.fetch(request);
      return response ?? new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response('Internal Error', { status: 500 });
    }
  },
};
