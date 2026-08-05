export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Manejar las rutas de la API
    if (url.pathname.startsWith('/api/list')) {
      const listId = url.searchParams.get('list') || url.searchParams.get('id');
      
      if (!listId) {
        return new Response(JSON.stringify({ error: 'Missing list ID' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (request.method === 'GET') {
        try {
          const data = await env.SHOPPING_KV.get(`list_${listId}`);
          return new Response(data || JSON.stringify({ items: [] }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }

      if (request.method === 'POST') {
        try {
          const body = await request.text();
          await env.SHOPPING_KV.put(`list_${listId}`, body);
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }
    }

    // Si no es la API, servir los archivos estáticos (HTML, CSS, JS) automáticamente
    return env.ASSETS.fetch(request);
  }
};
