/**********************************************************************
 *  CREAR PEDIDO DE PAYPAL (servidor)
 *  El navegador solo manda QUÉ productos y cuántos de cada uno.
 *  El IMPORTE se calcula aquí, en el servidor, con esta misma tabla
 *  de precios — así nadie puede manipular el precio desde el navegador.
 *
 *  IMPORTANTE: si cambias los precios en PRICES dentro del index.html,
 *  cambia también estos mismos números aquí abajo, para que coincidan.
 **********************************************************************/

const PRICES = {
  gorra:      7,
  dna:        15,
  racing:     15,
  attack:     15,
  signature:  15,
  overlay:    15,
  tech:       15,
  brush:      15,
};

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
    const { items } = JSON.parse(event.body || '{}');
    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Carrito vacío' }) };
    }

    let total = 0;
    items.forEach((it) => {
      const price = PRICES[it.productId] || 0;
      const qty = Number(it.qty) || 1;
      total += price * qty;
    });

    if (total <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Importe inválido' }) };
    }

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: 'Pedido H. Álvarez × First Edition',
            amount: {
              currency_code: 'EUR',
              value: total.toFixed(2),
            },
          },
        ],
      }),
    });
    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'PayPal rechazó la creación del pedido', detail: orderData }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: orderData.id, total: total.toFixed(2) }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
