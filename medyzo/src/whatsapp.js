/**
 * MEDYZO — WhatsApp Conversation Engine
 * Handles full state machine for user conversations
 */
const { t, detectLang } = require('./strings');
const { chatWithGemini } = require('./gemini');
const {
  getSession, setSession,
  getDoctorsByLocation, getDoctorById,
  getBookedSlots, createAppointment, getPatientAppointments,
  generateSlots, saveReview
} = require('./firebase');

const STATES = {
  WELCOME: 'WELCOME',
  LANG: 'LANG',
  NAME: 'NAME',
  LOCATION: 'LOCATION',
  MENU: 'MENU',
  FIND_DOCTOR: 'FIND_DOCTOR',
  SELECT_DATE: 'SELECT_DATE',
  SELECT_SLOT: 'SELECT_SLOT',
  CONFIRM_BOOKING: 'CONFIRM_BOOKING',
  AI_CHAT: 'AI_CHAT',
  POST_CONSULT: 'POST_CONSULT',
  REVIEW: 'REVIEW',
};

function fmtTime(t24) {
  if (!t24) return '';
  const [h, m] = t24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function parseDate(input) {
  // Accepts DD-MM-YYYY or YYYY-MM-DD
  const parts = input.trim().split(/[-\/]/);
  if (parts.length !== 3) return null;
  let d, m, y;
  if (parts[0].length === 4) { [y, m, d] = parts; }
  else { [d, m, y] = parts; }
  const date = new Date(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  if (isNaN(date.getTime())) return null;
  if (date < new Date(new Date().setHours(0,0,0,0))) return null; // past date
  return date.toISOString().split('T')[0];
}

/**
 * MAIN HANDLER — processes incoming WhatsApp message
 */
async function handleMessage(phone, body) {
  const msg = (body || '').trim();
  const msgLower = msg.toLowerCase();

  // Load session
  let session = await getSession(phone);
  const lang = session.lang || 'en';

  // Global shortcuts
  if (['menu', 'start', 'hi', 'hello', 'help', 'reset'].includes(msgLower)) {
    if (session.name) {
      session.state = STATES.MENU;
      await setSession(phone, session);
      return t(lang, 'mainMenu', { name: session.name });
    }
  }

  // ── STATE MACHINE ──────────────────────────────────────────
  switch (session.state) {

    // ── WELCOME / LANGUAGE SELECT ──
    case STATES.WELCOME:
    case STATES.LANG: {
      const selectedLang = detectLang(msg);
      if (!selectedLang) {
        await setSession(phone, { ...session, state: STATES.LANG });
        return t('en', 'welcome');
      }
      await setSession(phone, { ...session, lang: selectedLang, state: STATES.NAME });
      return t(selectedLang, 'askName');
    }

    // ── COLLECT NAME ──
    case STATES.NAME: {
      const name = msg.replace(/[^a-zA-Z\u0900-\u097F\u0980-\u09FF\u09E6-\u09EF\u0985-\u0A14 ]/g, '').trim();
      if (name.length < 2) {
        return `Please enter a valid name 🙏`;
      }
      await setSession(phone, { ...session, name, state: STATES.LOCATION });
      return t(lang, 'askLocation', { name });
    }

    // ── COLLECT LOCATION ──
    case STATES.LOCATION: {
      const location = msg.trim();
      if (location.length < 2) return `Please enter your city or area.`;
      await setSession(phone, { ...session, location, state: STATES.MENU });
      return t(lang, 'mainMenu', { name: session.name });
    }

    // ── MAIN MENU ──
    case STATES.MENU: {
      if (msg === '1') {
        // Find Doctor
        await setSession(phone, { ...session, state: STATES.FIND_DOCTOR });
        return await handleFindDoctor(phone, session, '');
      }
      if (msg === '2') {
        // My Appointments
        return await handleMyAppointments(phone, session);
      }
      if (msg === '3') {
        // Medicine Info
        await setSession(phone, { ...session, state: STATES.AI_CHAT, aiContext: 'medicine' });
        const prompts = {
          en: `💊 *Medicine Information*\n\nTell me the medicine name and I'll explain:\n• What it's used for\n• Side effects\n• What to avoid\n• Safety tips`,
          hi: `💊 *दवाई की जानकारी*\n\nदवाई का नाम बताएं:`,
          bn: `💊 *ওষুধের তথ্য*\n\nওষুধের নাম বলুন:`,
          as: `💊 *দৰবৰ তথ্য*\n\nদৰবৰ নাম ক'ব:`
        };
        return prompts[lang] || prompts.en;
      }
      if (msg === '4') {
        await setSession(phone, { ...session, state: STATES.AI_CHAT });
        const resp = await chatWithGemini(phone, 'Give me 3 quick health tips for today in a friendly WhatsApp message format.', lang);
        return resp;
      }
      if (msg === '5') {
        await setSession(phone, { ...session, state: STATES.AI_CHAT });
        const msgs = {
          en: `🤖 *AI Health Assistant Active*\n\nAsk me anything about your health, symptoms, medicines, or wellness!\n\n_Type *menu* anytime to go back._`,
          hi: `🤖 *AI सहायक सक्रिय*\n\nस्वास्थ्य, लक्षण, दवाई — कुछ भी पूछें!\n\n_*menu* लिखकर वापस जाएं।_`,
          bn: `🤖 *AI সহায়ক সক্রিয়*\n\nস্বাস্থ্য নিয়ে যেকোনো প্রশ্ন করুন!\n\n_*menu* লিখে ফিরে যান।_`,
          as: `🤖 *AI সহায়ক সক্ৰিয়*\n\nস্বাস্থ্যৰ বিষয়ে যিকোনো প্ৰশ্ন কৰক!`
        };
        return msgs[lang] || msgs.en;
      }
      // Fallback: treat as AI question
      await setSession(phone, { ...session, state: STATES.AI_CHAT });
      return await chatWithGemini(phone, msg, lang);
    }

    // ── FIND DOCTOR ──
    case STATES.FIND_DOCTOR: {
      return await handleFindDoctor(phone, session, msg);
    }

    // ── SELECT DATE ──
    case STATES.SELECT_DATE: {
      const date = parseDate(msg);
      if (!date) {
        return lang === 'hi' ? `❌ गलत तारीख। कृपया DD-MM-YYYY format में लिखें जैसे: 25-03-2026` :
               `❌ Invalid date. Please use format DD-MM-YYYY (e.g. 25-03-2026)`;
      }
      return await handleSlotSelection(phone, session, date);
    }

    // ── SELECT SLOT ──
    case STATES.SELECT_SLOT: {
      return await handleBookingConfirm(phone, session, msg);
    }

    // ── POST CONSULTATION ──
    case STATES.POST_CONSULT: {
      if (msg === '1') {
        await setSession(phone, { ...session, state: STATES.FIND_DOCTOR });
        return await handleFindDoctor(phone, session, '');
      }
      if (msg === '3') {
        await setSession(phone, { ...session, state: STATES.REVIEW });
        const doc = await getDoctorById(session.lastDoctorId);
        return t(lang, 'reviewPrompt', { doctor: doc?.name || 'Doctor' });
      }
      await setSession(phone, { ...session, state: STATES.MENU });
      return t(lang, 'mainMenu', { name: session.name });
    }

    // ── REVIEW ──
    case STATES.REVIEW: {
      const rating = parseInt(msg);
      if (rating >= 1 && rating <= 5) {
        await saveReview({
          doctorId: session.lastDoctorId,
          patientPhone: phone,
          patientName: session.name,
          rating,
          appointmentId: session.lastAppointmentId
        });
        await setSession(phone, { ...session, state: STATES.MENU });
        const thanks = {
          en: `⭐ Thank you for your review! Your feedback helps others.\n\nType *menu* to continue.`,
          hi: `⭐ धन्यवाद! आपकी review से दूसरों को मदद मिलेगी।`,
          bn: `⭐ ধন্যবাদ! আপনার রিভিউ অন্যদের সাহায্য করবে।`,
          as: `⭐ ধন্যবাদ! আপোনাৰ ৰিভিউ আনক সহায় কৰিব।`
        };
        return thanks[lang] || thanks.en;
      }
      return `Please reply with a number 1-5 ⭐`;
    }

    // ── AI CHAT MODE ──
    case STATES.AI_CHAT: {
      const reply = await chatWithGemini(phone, msg, lang);
      return `${reply}\n\n_Type *menu* to go back._`;
    }

    default: {
      await setSession(phone, { ...session, state: STATES.WELCOME });
      return t('en', 'welcome');
    }
  }
}

// ── SUB-HANDLERS ──────────────────────────────────────────

async function handleFindDoctor(phone, session, msg) {
  const lang = session.lang || 'en';
  const location = session.location || 'Silchar';

  // If user selects a doctor number
  if (session.doctorList && /^\d+$/.test(msg)) {
    const idx = parseInt(msg) - 1;
    const selected = session.doctorList[idx];
    if (selected) {
      const labels = { en: 'Select date', hi: 'तारीख चुनें', bn: 'তারিখ বেছুন', as: 'তাৰিখ বাছক' };
      await setSession(phone, { ...session, selectedDoctorId: selected.id, state: STATES.SELECT_DATE });
      return t(lang, 'selectDate', { name: selected.name, specialty: selected.specialty });
    }
  }

  // Fetch doctors
  let doctors = await getDoctorsByLocation(location);
  
  // If none found, show all as demo
  if (!doctors.length) {
    // Return helpful message
    const nf = {
      en: `😕 No doctors found near *${location}* yet.\n\n_Clinics are being added. Type *5* to chat with our AI assistant or *menu* to go back._`,
      hi: `😕 *${location}* के पास अभी कोई डॉक्टर नहीं मिला।\n\n_Type *5* for AI assistant._`,
      bn: `😕 *${location}*-এর কাছে এখনো ডাক্তার নেই।`,
      as: `😕 *${location}*-ৰ ওচৰত এতিয়া চিকিৎসক নাই।`
    };
    await setSession(phone, { ...session, state: STATES.MENU });
    return nf[lang] || nf.en;
  }

  // Store list in session
  await setSession(phone, { ...session, doctorList: doctors.map(d => ({ id: d.id, name: d.name, specialty: d.specialty })), state: STATES.FIND_DOCTOR });

  const listText = doctors.slice(0, 8).map((d, i) =>
    `*${i + 1}.* 👨‍⚕️ Dr. ${d.name}\n    ${d.specialty} | ⏰ ${fmtTime(d.timingFrom)}–${fmtTime(d.timingUntil)} | ₹${d.fee || '–'}\n    🏥 ${d.clinicName || 'Clinic'} ${d.rating ? `| ⭐ ${d.rating}` : ''}`
  ).join('\n\n');

  return t(lang, 'doctorList', { location, list: listText });
}

async function handleSlotSelection(phone, session, date) {
  const lang = session.lang || 'en';
  const doctorId = session.selectedDoctorId;
  const doc = await getDoctorById(doctorId);

  if (!doc) {
    await setSession(phone, { ...session, state: STATES.MENU });
    return t(lang, 'error');
  }

  const bookedSlots = await getBookedSlots(doctorId, date);
  const slots = generateSlots(doc.timingFrom || '09:00', doc.timingUntil || '17:00', doc.slotDuration || 30, bookedSlots, doc.maxPatients || 20);

  const available = slots.filter(s => s.available);
  if (!available.length) {
    await setSession(phone, { ...session, state: STATES.FIND_DOCTOR });
    return t(lang, 'bookingFull', { name: doc.name, date });
  }

  const slotText = available.slice(0, 12).map((s, i) => `*${i + 1}* — ${fmtTime(s.slot)}`).join('\n');
  await setSession(phone, { ...session, selectedDate: date, availableSlots: available.map(s => s.slot), state: STATES.SELECT_SLOT });

  return t(lang, 'selectSlot', { date, slots: slotText });
}

async function handleBookingConfirm(phone, session, msg) {
  const lang = session.lang || 'en';
  const idx = parseInt(msg) - 1;
  const slots = session.availableSlots || [];

  if (isNaN(idx) || idx < 0 || idx >= slots.length) {
    const err = { en: 'Please select a valid slot number.', hi: 'सही नंबर चुनें।', bn: 'সঠিক নম্বর দিন।', as: 'সঠিক নম্বৰ দিয়ক।' };
    return err[lang] || err.en;
  }

  const timeSlot = slots[idx];
  const doc = await getDoctorById(session.selectedDoctorId);

  // Double-check slot is still available
  const bookedSlots = await getBookedSlots(session.selectedDoctorId, session.selectedDate);
  if (bookedSlots.includes(timeSlot)) {
    const taken = { en: '⚠️ That slot was just taken! Please choose another.', hi: '⚠️ यह स्लॉट अभी बुक हो गया! दूसरा चुनें।' };
    return taken[lang] || taken.en;
  }

  // Create booking — include clinicId so the appointment is scoped to the clinic
  const { id: appointmentId, token } = await createAppointment({
    doctorId: session.selectedDoctorId,
    doctorName: doc.name,
    clinicName: doc.clinicName,
    clinicId: doc.clinicId || '',   // ← crucial: scope appointment to clinic
    patientPhone: phone,
    patientName: session.name,
    date: session.selectedDate,
    timeSlot,
    lang
  });

  await setSession(phone, {
    ...session,
    state: STATES.MENU,
    lastAppointmentId: appointmentId,
    lastDoctorId: session.selectedDoctorId
  });

  return t(lang, 'bookingConfirmed', {
    doctor: doc.name,
    clinic: doc.clinicName || 'Clinic',
    date: session.selectedDate,
    time: fmtTime(timeSlot),
    token
  });
}

async function handleMyAppointments(phone, session) {
  const lang = session.lang || 'en';
  const appts = await getPatientAppointments(phone);
  const upcoming = appts.filter(a => a.date >= new Date().toISOString().split('T')[0] && a.status !== 'cancelled');

  if (!upcoming.length) {
    const none = {
      en: `📋 You have no upcoming appointments.\n\nType *1* to book one!`,
      hi: `📋 कोई upcoming appointment नहीं है।\n\nType *1* बुक करने के लिए!`,
      bn: `📋 কোনো upcoming অ্যাপয়েন্টমেন্ট নেই।`,
      as: `📋 কোনো upcoming appointment নাই।`
    };
    return none[lang] || none.en;
  }

  const list = upcoming.slice(0, 5).map(a =>
    `🔹 Dr. ${a.doctorName} | 📅 ${a.date} | 🕐 ${fmtTime(a.timeSlot)} | Token #${a.token} | ${a.status.toUpperCase()}`
  ).join('\n');

  const hdr = { en: `📋 *Your Appointments:*\n\n`, hi: `📋 *आपकी Appointments:*\n\n`, bn: `📋 *আপনার অ্যাপয়েন্টমেন্ট:*\n\n`, as: `📋 *আপোনাৰ Appointments:*\n\n` };
  return (hdr[lang] || hdr.en) + list;
}

module.exports = { handleMessage };
