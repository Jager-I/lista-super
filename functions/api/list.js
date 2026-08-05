export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const listId = url.searchParams.get('list') || url.searchParams.get('id');

  if (!listId) {
    return new Response(JSON.stringify({ error: 'Missing list ID' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // SHOPPING_KV debe ser el nombre del KV Namespace bindeado en Cloudflare Pages
  try {
    const data = await env.SHOPPING_KV.get(`list_${listId}`);
    
    if (data) {
      return new Response(data, { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ items: [] }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const listId = url.searchParams.get('list') || url.searchParams.get('id');

  if (!listId) {
    return new Response(JSON.stringify({ error: 'Missing list ID' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const requestData = await request.json();
    
    // Guardar en KV
    await env.SHOPPING_KV.put(`list_${listId}`, JSON.stringify(requestData));
    
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
