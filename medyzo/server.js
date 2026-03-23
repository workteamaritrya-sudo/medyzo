/**
 * MEDYZO — Main Server (Multi-Clinic)
 * Each clinic registers, logs in, and manages their own data.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const crypto = require('crypto');
const path = require('path');

const fb = require('./src/firebase');
const { handleMessage } = require('./src/whatsapp');
const { twimlReply, sendWhatsApp } = require('./src/twilio');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'portal')));

// ── FIREBASE INIT ─────────────────────────────────────────
try { fb.initFirebase(); } catch (e) { console.warn('[Firebase] Init warning:', e.message); }

// ── TOKEN HELPERS ─────────────────────────────────────────
function makeToken(clinicId, email) {
  return Buffer.from(`${clinicId}||${email}||${Date.now()}`).toString('base64');
}

function parseToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [clinicId, email] = decoded.split('||');
    return { clinicId, email };
  } catch { return null; }
}

// Auth middleware — attaches req.clinicId to every protected request
async function clinicAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const parsed = parseToken(token);
  if (!parsed?.clinicId) return res.status(401).json({ error: 'Invalid token' });
  const clinic = await fb.getClinicById(parsed.clinicId).catch(() => null);
  if (!clinic) return res.status(401).json({ error: 'Clinic not found' });
  req.clinicId = parsed.clinicId;
  req.clinic = clinic;
  next();
}

// ── WHATSAPP WEBHOOK ──────────────────────────────────────
app.post('/webhook/whatsapp', async (req, res) => {
  const body = req.body.Body || '';
  const from = req.body.From || '';
  console.log(`[WA] ${from}: ${body}`);
  try {
    const phone = from.replace('whatsapp:', '');
    const reply = await handleMessage(phone, body);
    twimlReply(res, reply);
  } catch (err) {
    console.error('[WA] Error:', err.message);
    twimlReply(res, '😅 Something went wrong. Type *menu* to restart.');
  }
});

app.get('/webhook/whatsapp', (req, res) => res.send('Medyzo WhatsApp Webhook ✅'));

// ── CLINIC REGISTER ───────────────────────────────────────
app.post('/api/clinic/register', async (req, res) => {
  try {
    const result = await fb.registerClinic(req.body);
    const token = makeToken(result.clinicId, result.email);
    res.json({ success: true, token, clinic: result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── CLINIC LOGIN ──────────────────────────────────────────
app.post('/api/clinic/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await fb.loginClinic(email, password);
    const token = makeToken(result.clinicId, result.email);
    res.json({ success: true, token, clinic: result });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

// ── CLINIC PROFILE ────────────────────────────────────────
app.get('/api/clinic/profile', clinicAuth, async (req, res) => {
  try { res.json(await fb.getClinicProfile(req.clinicId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/clinic/profile', clinicAuth, async (req, res) => {
  try { await fb.updateClinicProfile(req.clinicId, req.body); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DOCTORS ──────────────────────────────────────────────
app.get('/api/doctors', clinicAuth, async (req, res) => {
  try { res.json(await fb.getDoctorsByClinic(req.clinicId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/doctors', clinicAuth, async (req, res) => {
  try {
    const id = req.body.id || Date.now().toString(36);
    await fb.saveDoctor(req.clinicId, id, req.body);
    res.json({ success: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/doctors/:id', clinicAuth, async (req, res) => {
  try { await fb.saveDoctor(req.clinicId, req.params.id, req.body); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/doctors/:id', clinicAuth, async (req, res) => {
  try { await fb.deleteDoctor(req.clinicId, req.params.id); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ── APPOINTMENTS ──────────────────────────────────────────
app.get('/api/appointments', clinicAuth, async (req, res) => {
  try {
    const { date, doctorId, status } = req.query;
    res.json(await fb.getAllAppointmentsByClinic(req.clinicId, { date, doctorId, status }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', clinicAuth, async (req, res) => {
  try {
    await fb.updateAppointment(req.clinicId, req.params.id, req.body);
    // Post-consultation WhatsApp flow
    if (req.body.status === 'done') {
      const appt = await fb.getAppointmentById(req.params.id);
      if (appt?.patientPhone) {
        const lang = appt.lang || 'en';
        const msgs = {
          en: `✅ Your consultation with Dr. ${appt.doctorName} is complete!\n\n1️⃣ Book Follow-up\n2️⃣ Leave a Review\n\nReply with your choice.`,
          hi: `✅ Dr. ${appt.doctorName} के साथ consultation पूरी!\n\n1️⃣ Follow-up बुक करें\n2️⃣ Review दें`,
          bn: `✅ Dr. ${appt.doctorName}-এর সাথে consultation শেষ!`,
          as: `✅ Dr. ${appt.doctorName}-ৰ consultation শেষ!`
        };
        try { await sendWhatsApp(appt.patientPhone, msgs[lang] || msgs.en); } catch {}
        const sess = await fb.getSession(appt.patientPhone);
        await fb.setSession(appt.patientPhone, { ...sess, state: 'POST_CONSULT', lastDoctorId: appt.doctorId, lastAppointmentId: appt.id });
      }
    }
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── QUEUE ─────────────────────────────────────────────────
app.get('/api/queue/:doctorId', clinicAuth, async (req, res) => {
  try { res.json(await fb.getQueue(req.clinicId, req.params.doctorId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/queue/:doctorId/advance', clinicAuth, async (req, res) => {
  try {
    const result = await fb.advanceQueue(req.clinicId, req.params.doctorId);
    if (!result) return res.json({ message: 'Queue empty' });
    const { current, next } = result;
    const doc = await fb.getDoctorById(req.params.doctorId);
    // Notify current patient
    if (current?.patientPhone) {
      const lang = current.lang || 'en';
      const msgs = {
        en: `🚨 *It's Your Turn!*\n\nDr. ${doc?.name} is ready for you now.\n🏥 ${doc?.clinicName || req.clinic.name}\n🔢 Token #${current.token}`,
        hi: `🚨 *आपकी बारी!*\n\nDr. ${doc?.name} तैयार हैं। Token #${current.token}`,
        bn: `🚨 আপনার পালা! Dr. ${doc?.name} প্রস্তুত।`,
        as: `🚨 আপোনাৰ পাল! Dr. ${doc?.name} প্ৰস্তুত।`
      };
      try { await sendWhatsApp(current.patientPhone, msgs[lang] || msgs.en); } catch {}
    }
    // Notify next patient to get ready
    if (next?.patientPhone) {
      const lang = next.lang || 'en';
      const ready = {
        en: `⏰ *Get Ready!*\n\nYou're next in line. Token #${next.token}\n\nPlease be at the clinic in the next 10-15 minutes.`,
        hi: `⏰ तैयार हो जाएं! Token #${next.token} — 10-15 मिनट में पहुंचें।`,
        bn: `⏰ প্রস্তুত থাকুন! Token #${next.token}`,
        as: `⏰ প্ৰস্তুত থাকক! Token #${next.token}`
      };
      try { await sendWhatsApp(next.patientPhone, ready[lang] || ready.en); } catch {}
    }
    res.json({ success: true, current, next });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── STATS ─────────────────────────────────────────────────
app.get('/api/stats', clinicAuth, async (req, res) => {
  try { res.json(await fb.getClinicStats(req.clinicId)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── REMINDER CRON (every 30 min) ─────────────────────────
cron.schedule('*/30 * * * *', async () => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const snap = await require('./src/firebase').getDb?.();
    // Query all appointments for today across all clinics
    const all = await fb.getAllAppointmentsByClinic('', { date: today }).catch(() => []);
    for (const appt of all) {
      if (!['pending', 'confirmed'].includes(appt.status) || appt.reminderSent) continue;
      const [h, m] = (appt.timeSlot || '00:00').split(':').map(Number);
      const apptTime = new Date(`${today}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
      const diff = apptTime - now;
      if (diff > 0 && diff < 35 * 60 * 1000) {
        const lang = appt.lang || 'en';
        const msgs = {
          en: `🔔 Reminder: Your appointment with Dr. ${appt.doctorName} is in 30 min!\n📅 ${appt.date} at ${appt.timeSlot}\n🔢 Token #${appt.token}`,
          hi: `🔔 Reminder: Dr. ${appt.doctorName} से 30 मिनट में! Token #${appt.token}`,
          bn: `🔔 Dr. ${appt.doctorName} ৩০ মিনিটে!`,
          as: `🔔 Dr. ${appt.doctorName} ৩০ মিনিটত!`
        };
        try {
          await sendWhatsApp(appt.patientPhone, msgs[lang] || msgs.en);
          await fb.updateAppointment(appt.clinicId, appt.id, { reminderSent: true });
        } catch {}
      }
    }
  } catch (e) { console.error('[Cron]', e.message); }
});

// ── SERVE PORTAL ──────────────────────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/webhook')) {
    res.sendFile(path.join(__dirname, 'portal', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`\n🌟 MEDYZO Server — Port ${PORT}`);
  console.log(`📱 WhatsApp:  http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`🏥 Portal:    http://localhost:${PORT}`);
});

module.exports = app;
