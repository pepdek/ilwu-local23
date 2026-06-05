exports.handler = async function() {
  try {
    const res = await fetch('https://docs.nwseaportalliance.com/Vessel/Schedule.xls');
    const buf = await res.arrayBuffer();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800',
      },
      body: Buffer.from(buf).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
