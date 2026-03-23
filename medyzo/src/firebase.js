/**
 * MEDYZO — Firebase Firestore Module (Multi-Clinic)
 * Each clinic has their own account, doctors, and appointments.
 * All data is scoped by clinicId.
 */
const admin = require('firebase-admin');
const path = require('path');
const crypto = require('crypto');

let db;

function initFirebase() {
  if (admin.apps.length) { db = admin.firestore(); return; }
  try {
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-service-account.json';
    const serviceAccount = require(path.resolve(saPath));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'medyzo-6ebbc' });
  } catch (e) {
    admin.initializeApp({ projectId: 'medyzo-6ebbc' });
    console.warn('[Firebase] Using default credentials:', e.message);
  }
  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  console.log('[Firebase] ✅ Firestore connected — project: medyzo-6ebbc');
}

function getDb() { if (!db) initFirebase(); return db; }
function hashPassword(pw) { return crypto.createHash('sha256').update(pw + 'medyzo_salt').digest('hex'); }
function sanitize(str) { return str.replace(/[^a-zA-Z0-9_-]/g, '_'); }

// ── CLINIC AUTH ────────────────────────────────────────────
async function registerClinic(data) {
  const { name, city, address, phone, email, password } = data;
  if (!name || !email || !password) throw new Error('Name, email and password are required');

  // Check email not already registered
  const existing = await getDb().collection('clinics').where('email', '==', email.toLowerCase()).get();
  if (!existing.empty) throw new Error('This email is already registered');

  const ref = getDb().collection('clinics').doc();
  const clinicId = ref.id;
  const clinicData = {
    clinicId, name, city: city || '', address: address || '',
    phone: phone || '', email: email.toLowerCase(),
    password: hashPassword(password),
    active: true, createdAt: Date.now()
  };
  await ref.set(clinicData);
  console.log(`[Auth] ✅ New clinic registered: ${name} (${clinicId})`);
  return { clinicId, name, email: email.toLowerCase() };
}

async function loginClinic(email, password) {
  const snap = await getDb().collection('clinics')
    .where('email', '==', email.toLowerCase())
    .where('active', '==', true)
    .get();
  if (snap.empty) throw new Error('No clinic account found with this email');

  const doc = snap.docs[0];
  const clinic = { clinicId: doc.id, ...doc.data() };
  if (clinic.password !== hashPassword(password)) throw new Error('Incorrect password');

  return { clinicId: clinic.clinicId, name: clinic.name, email: clinic.email };
}

async function getClinicById(clinicId) {
  const snap = await getDb().collection('clinics').doc(clinicId).get();
  return snap.exists ? { clinicId: snap.id, ...snap.data() } : null;
}

// ── CLINIC PROFILE ─────────────────────────────────────────
async function getClinicProfile(clinicId) {
  const snap = await getDb().collection('clinics').doc(clinicId).get();
  if (!snap.exists) return {};
  const d = snap.data();
  // Don't return password
  const { password, ...safe } = d;
  return safe;
}

async function updateClinicProfile(clinicId, data) {
  const { password, clinicId: _, ...safe } = data; // strip sensitive fields from update
  await getDb().collection('clinics').doc(clinicId)
    .update({ ...safe, updatedAt: Date.now() });
}

// ── DOCTORS (scoped by clinicId) ───────────────────────────
async function getDoctorsByLocation(location) {
  const snap = await getDb().collection('doctors').where('active', '!=', false).get();
  const loc = location.toLowerCase();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d =>
      d.city?.toLowerCase().includes(loc) ||
      loc.includes(d.city?.toLowerCase() || '__')
    );
}

async function getDoctorById(id) {
  const snap = await getDb().collection('doctors').doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function getDoctorsByClinic(clinicId) {
  const snap = await getDb().collection('doctors').where('clinicId', '==', clinicId).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveDoctor(clinicId, id, data) {
  await getDb().collection('doctors').doc(id)
    .set({ ...data, clinicId, updatedAt: Date.now() }, { merge: true });
}

async function deleteDoctor(clinicId, id) {
  // Ensure doctor belongs to this clinic
  const doc = await getDoctorById(id);
  if (doc?.clinicId !== clinicId) throw new Error('Unauthorized');
  await getDb().collection('doctors').doc(id).delete();
}

// ── APPOINTMENTS (scoped by clinicId) ──────────────────────
async function getBookedSlots(doctorId, date) {
  const snap = await getDb().collection('appointments')
    .where('doctorId', '==', doctorId).where('date', '==', date).get();
  return snap.docs.map(d => d.data()).filter(a => a.status !== 'cancelled').map(a => a.timeSlot);
}

async function getTodayAppointmentsByDoctor(doctorId) {
  const today = new Date().toISOString().split('T')[0];
  const snap = await getDb().collection('appointments')
    .where('doctorId', '==', doctorId).where('date', '==', today).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.status !== 'cancelled')
    .sort((a, b) => a.timeSlot?.localeCompare(b.timeSlot));
}

async function getAllAppointmentsByClinic(clinicId, filters = {}) {
  let query = getDb().collection('appointments').where('clinicId', '==', clinicId);
  if (filters.date) query = query.where('date', '==', filters.date);
  if (filters.doctorId) query = query.where('doctorId', '==', filters.doctorId);
  if (filters.status) query = query.where('status', '==', filters.status);
  const snap = await query.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.timeSlot?.localeCompare(b.timeSlot));
}

async function createAppointment(data) {
  const byDoctor = await getTodayAppointmentsByDoctor(data.doctorId);
  const token = byDoctor.length + 1;
  const ref = getDb().collection('appointments').doc();
  const id = ref.id;
  await ref.set({ id, token, status: 'pending', createdAt: Date.now(), ...data });
  return { id, token };
}

async function updateAppointment(clinicId, id, updates) {
  const snap = await getDb().collection('appointments').doc(id).get();
  if (!snap.exists) throw new Error('Appointment not found');
  if (snap.data().clinicId !== clinicId) throw new Error('Unauthorized');
  await getDb().collection('appointments').doc(id)
    .update({ ...updates, updatedAt: Date.now() });
}

async function getAppointmentById(id) {
  const snap = await getDb().collection('appointments').doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function getPatientAppointments(phone) {
  const snap = await getDb().collection('appointments')
    .where('patientPhone', '==', phone).orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── QUEUE ─────────────────────────────────────────────────
async function getQueue(clinicId, doctorId) {
  const appts = await getTodayAppointmentsByDoctor(doctorId);
  return appts.filter(a => ['pending', 'confirmed', 'in_progress'].includes(a.status));
}

async function advanceQueue(clinicId, doctorId) {
  const queue = await getQueue(clinicId, doctorId);
  if (!queue.length) return null;
  const current = queue.find(a => a.status === 'in_progress') || queue[0];
  const next = queue.find(a => a.id !== current.id && a.status !== 'in_progress');
  if (current.status !== 'in_progress') {
    await updateAppointment(clinicId, current.id, { status: 'in_progress' });
  }
  return { current, next, queue };
}

// ── STATS ─────────────────────────────────────────────────
async function getClinicStats(clinicId) {
  const today = new Date().toISOString().split('T')[0];
  const [appts, doctors] = await Promise.all([
    getAllAppointmentsByClinic(clinicId, { date: today }),
    getDoctorsByClinic(clinicId)
  ]);
  return {
    totalToday: appts.length,
    confirmed: appts.filter(a => a.status === 'confirmed').length,
    pending: appts.filter(a => a.status === 'pending').length,
    done: appts.filter(a => a.status === 'done').length,
    cancelled: appts.filter(a => a.status === 'cancelled').length,
    totalDoctors: doctors.length,
    activeDoctors: doctors.filter(d => d.active !== false).length
  };
}

// ── REVIEWS ───────────────────────────────────────────────
async function saveReview(data) {
  const ref = getDb().collection('reviews').doc();
  await ref.set({ id: ref.id, createdAt: Date.now(), ...data });
}

// ── USER SESSIONS (WhatsApp) ───────────────────────────────
async function getSession(phone) {
  const snap = await getDb().collection('sessions').doc(sanitize(phone)).get();
  return snap.exists ? snap.data() : { phone, state: 'WELCOME', lang: 'en', createdAt: Date.now() };
}

async function setSession(phone, data) {
  await getDb().collection('sessions').doc(sanitize(phone))
    .set({ ...data, updatedAt: Date.now() }, { merge: true });
}

// ── SLOT GENERATOR ────────────────────────────────────────
function generateSlots(timingFrom, timingUntil, slotDuration, bookedSlots = [], maxPatients = 20) {
  const slots = [];
  let [h, m] = timingFrom.split(':').map(Number);
  const [eh, em] = timingUntil.split(':').map(Number);
  while (h * 60 + m + slotDuration <= eh * 60 + em) {
    const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push({ slot, available: !bookedSlots.includes(slot) });
    m += slotDuration;
    if (m >= 60) { h += Math.floor(m / 60); m %= 60; }
  }
  if (bookedSlots.length >= maxPatients) return slots.map(s => ({ ...s, available: false }));
  return slots;
}

module.exports = {
  initFirebase,
  registerClinic, loginClinic, getClinicById, getClinicProfile, updateClinicProfile,
  getDoctorsByLocation, getDoctorById, getDoctorsByClinic, saveDoctor, deleteDoctor,
  getBookedSlots, getTodayAppointmentsByDoctor, getAllAppointmentsByClinic, createAppointment,
  updateAppointment, getAppointmentById, getPatientAppointments,
  getQueue, advanceQueue, getClinicStats,
  saveReview,
  getSession, setSession,
  generateSlots
};
