exports.handler = async function(event) {
  const screen = event.queryStringParameters?.screen ?? "1";
  try {
    const res = await fetch(`http://ilwu23.com/?screen=${screen}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=60",
      },
      body: html,
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
