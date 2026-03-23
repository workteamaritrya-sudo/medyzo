/**
 * MEDYZO — Twilio WhatsApp Sender
 */
const twilio = require('twilio');

let client;

function getTwilio() {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

async function sendWhatsApp(to, message) {
  try {
    const from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    const toNum = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const msg = await getTwilio().messages.create({ from, to: toNum, body: message });
    console.log(`[Twilio] Sent to ${to}: ${msg.sid}`);
    return msg;
  } catch (err) {
    console.error('[Twilio] Send error:', err.message);
    throw err;
  }
}

/**
 * Build TwiML response for webhook
 */
function twimlReply(res, message) {
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`);
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendWhatsApp, twimlReply };
