/**********************************************************************
 *  CONFIRMAR (CAPTURAR) EL PAGO DE PAYPAL (servidor)
 *  Se llama justo después de que el cliente aprueba el pago en la
 *  ventana de PayPal. Aquí se confirma con PayPal, en el servidor,
 *  que el cobro se ha completado de verdad antes de dar el pedido
 *  por bueno en la web.
 **********************************************************************/

function paypalBase() {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64');

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) throw new Error('No se pudo autenticar con PayPal: ' + JSON.stringify(data));
  return data.access_token;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { orderId } = JSON.parse(event.body || '{}');
    if (!orderId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta orderId' }) };
    }

    const accessToken = await getAccessToken();

    const captureRes = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const captureData = await captureRes.json();

    // Si PayPal dice que el pedido ya estaba capturado (p.ej. doble clic),
    // lo tratamos igualmente como éxito en vez de como error.
    const alreadyCaptured = captureData.details &&
      captureData.details.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED');

    if (!captureRes.ok && !alreadyCaptured) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'FAILED', detail: captureData }),
      };
    }

    const status = captureData.status || (alreadyCaptured ? 'COMPLETED' : 'UNKNOWN');
    const capturedAmount =
      captureData.purchase_units &&
      captureData.purchase_units[0] &&
      captureData.purchase_units[0].payments &&
      captureData.purchase_units[0].payments.captures &&
      captureData.purchase_units[0].payments.captures[0]
        ? captureData.purchase_units[0].payments.captures[0].amount.value
        : null;

    return {
      statusCode: 200,
      body: JSON.stringify({ status, capturedAmount }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
