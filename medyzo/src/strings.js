/**
 * MEDYZO — Multi-language strings
 * Supports: en, hi, bn, as (Assamese)
 */
const STRINGS = {
  en: {
    welcome: `🌟 *Welcome to Medyzo* — Your personal health assistant!\n\nPlease select your preferred language:\n1️⃣ English\n2️⃣ Hindi (हिंदी)\n3️⃣ Bengali (বাংলা)\n4️⃣ Assamese (অসমীয়া)`,
    askName: `Great! I'm Medyzo 🩺\n\nMay I know your *name* please?`,
    askLocation: `Nice to meet you, *{name}*! 😊\n\nTo show you nearby doctors, could you share your *city or area*?\n_(e.g., Silchar, Guwahati, Kolkata)_`,
    mainMenu: `Hello *{name}*! 👋 How can I help you today?\n\n🔹 *1* — Find a Doctor\n🔹 *2* — My Appointments\n🔹 *3* — Medicine Info\n🔹 *4* — Health Tips\n🔹 *5* — Talk to AI Assistant\n\n_Or just type your question directly!_`,
    doctorList: `📍 Doctors near *{location}*:\n\n{list}\n\nReply with the *doctor number* to book an appointment.`,
    selectDate: `📅 You selected *Dr. {name}* ({specialty})\n\nPlease enter your preferred date:\n_Format: DD-MM-YYYY (e.g., 25-03-2026)_`,
    selectSlot: `🕐 Available slots for *{date}*:\n\n{slots}\n\nReply with slot number to confirm.`,
    bookingConfirmed: `✅ *Appointment Confirmed!*\n\n👨‍⚕️ Doctor: Dr. {doctor}\n🏥 Clinic: {clinic}\n📅 Date: {date}\n🕐 Time: {time}\n🔢 Token: *#{token}*\n\n_We'll send you a reminder 30 minutes before._`,
    bookingFull: `⚠️ Sorry, *Dr. {name}* has no available slots on {date}.\n\nWould you like to:\n1️⃣ Choose another date\n2️⃣ Choose another doctor`,
    queueUpdate: `🔔 *Queue Update*\n\n#{token} — Your turn is coming up!\n⏱ Estimated wait: *{eta} minutes*\n\nPlease be ready at the clinic.`,
    turnNow: `🚨 *It's Your Turn!*\n\nDr. {doctor} is ready for you now.\n🏥 Please proceed to *{clinic}*`,
    followUp: `✨ Hope your consultation went well!\n\n1️⃣ Book a follow-up appointment\n2️⃣ View/upload reports\n3️⃣ Leave a review\n4️⃣ Back to menu`,
    reviewPrompt: `⭐ How would you rate your experience with *Dr. {doctor}*?\n\nReply 1-5 (5 = Excellent)`,
    error: `😅 Something went wrong. Please try again or type *menu* to start over.`,
    typing: `_Medyzo is thinking..._`,
  },
  hi: {
    welcome: `🌟 *Medyzo में आपका स्वागत है* — आपका व्यक्तिगत स्वास्थ्य सहायक!\n\nकृपया अपनी भाषा चुनें:\n1️⃣ English\n2️⃣ हिंदी\n3️⃣ Bengali (বাংলা)\n4️⃣ Assamese (অসমীয়া)`,
    askName: `बढ़िया! मैं Medyzo हूँ 🩺\n\nआपका *नाम* क्या है?`,
    askLocation: `मिलकर खुशी हुई, *{name}*! 😊\n\nपास के डॉक्टर दिखाने के लिए, आप किस *शहर या इलाके* में हैं?\n_(जैसे: Silchar, Guwahati, Kolkata)_`,
    mainMenu: `नमस्ते *{name}*! 👋 आज मैं आपकी कैसे मदद करूँ?\n\n🔹 *1* — डॉक्टर खोजें\n🔹 *2* — मेरी appointments\n🔹 *3* — दवाई की जानकारी\n🔹 *4* — स्वास्थ्य सुझाव\n🔹 *5* — AI सहायक से बात करें\n\n_या सीधे अपना सवाल लिखें!_`,
    doctorList: `📍 *{location}* के पास डॉक्टर:\n\n{list}\n\nDoctors number reply करें appointment book करने के लिए।`,
    selectDate: `📅 आपने *Dr. {name}* ({specialty}) को चुना\n\nकृपया तारीख बताएं:\n_Format: DD-MM-YYYY (जैसे: 25-03-2026)_`,
    selectSlot: `🕐 *{date}* के लिए उपलब्ध समय:\n\n{slots}\n\nस्लॉट नंबर reply करें।`,
    bookingConfirmed: `✅ *Appointment Confirmed!*\n\n👨‍⚕️ डॉक्टर: Dr. {doctor}\n🏥 क्लिनिक: {clinic}\n📅 तारीख: {date}\n🕐 समय: {time}\n🔢 Token: *#{token}*\n\n_30 मिनट पहले reminder भेजेंगे।_`,
    bookingFull: `⚠️ माफ़ करें, *Dr. {name}* के पास {date} को कोई स्लॉट उपलब्ध नहीं है।\n\n1️⃣ दूसरी तारीख चुनें\n2️⃣ दूसरा डॉक्टर चुनें`,
    queueUpdate: `🔔 *Queue अपडेट*\n\n#{token} — आपकी बारी जल्द आने वाली है!\n⏱ अनुमानित प्रतीक्षा: *{eta} मिनट*\n\nकृपया तैयार रहें।`,
    turnNow: `🚨 *आपकी बारी है!*\n\nDr. {doctor} आपके लिए तैयार हैं।\n🏥 *{clinic}* में आएं`,
    followUp: `✨ उम्मीद है consultation अच्छी रही!\n\n1️⃣ Follow-up appointment\n2️⃣ Reports देखें/upload करें\n3️⃣ Review दें\n4️⃣ Menu पर जाएं`,
    reviewPrompt: `⭐ *Dr. {doctor}* के साथ अनुभव कैसा रहा?\n\n1-5 reply करें (5 = बेहतरीन)`,
    error: `😅 कुछ गड़बड़ हुई। फिर कोशिश करें या *menu* लिखें।`,
    typing: `_Medyzo सोच रहा है..._`,
  },
  bn: {
    welcome: `🌟 *Medyzo-তে স্বাগতম* — আপনার ব্যক্তিগত স্বাস্থ্য সহায়ক!\n\nআপনার পছন্দের ভাষা বেছে নিন:\n1️⃣ English\n2️⃣ Hindi (হিন্দি)\n3️⃣ বাংলা\n4️⃣ Assamese (অসমীয়া)`,
    askName: `চমৎকার! আমি Medyzo 🩺\n\nআপনার *নাম* কী?`,
    askLocation: `আলাপ হয়ে ভালো লাগলো, *{name}*! 😊\n\nকাছের ডাক্তার দেখাতে, আপনি কোন *শহর বা এলাকায়* আছেন?\n_(যেমন: Silchar, Kolkata)_`,
    mainMenu: `হ্যালো *{name}*! 👋 আজ কী সাহায্য করতে পারি?\n\n🔹 *1* — ডাক্তার খুঁজুন\n🔹 *2* — আমার অ্যাপয়েন্টমেন্ট\n🔹 *3* — ওষুধের তথ্য\n🔹 *4* — স্বাস্থ্য টিপস\n🔹 *5* — AI সহায়কের সাথে কথা বলুন`,
    doctorList: `📍 *{location}*-এর কাছে ডাক্তার:\n\n{list}\n\nঅ্যাপয়েন্টমেন্ট বুক করতে ডাক্তারের নম্বর টাইপ করুন।`,
    selectDate: `📅 আপনি *Dr. {name}* ({specialty}) বেছেছেন\n\nপছন্দের তারিখ বলুন:\n_Format: DD-MM-YYYY_`,
    selectSlot: `🕐 *{date}* তারিখে পাওয়া যাচ্ছে:\n\n{slots}\n\nস্লট নম্বর দিন।`,
    bookingConfirmed: `✅ *অ্যাপয়েন্টমেন্ট নিশ্চিত!*\n\n👨‍⚕️ ডাক্তার: Dr. {doctor}\n🏥 ক্লিনিক: {clinic}\n📅 তারিখ: {date}\n🕐 সময়: {time}\n🔢 Token: *#{token}*`,
    bookingFull: `⚠️ দুঃখিত, *Dr. {name}*-এর {date} তারিখে কোনো স্লট নেই।\n\n1️⃣ অন্য তারিখ বেছে নিন\n2️⃣ অন্য ডাক্তার বেছে নিন`,
    queueUpdate: `🔔 *Queue আপডেট*\n\n#{token} — আপনার পালা আসছে!\n⏱ আনুমানিক অপেক্ষা: *{eta} মিনিট*`,
    turnNow: `🚨 *আপনার পালা এসেছে!*\n\nDr. {doctor} প্রস্তুত।\n🏥 *{clinic}*-এ আসুন`,
    followUp: `✨ আশা করি ভালো হলো!\n\n1️⃣ ফলো-আপ অ্যাপয়েন্টমেন্ট\n2️⃣ রিপোর্ট দেখুন\n3️⃣ রিভিউ দিন\n4️⃣ মেনুতে ফিরুন`,
    reviewPrompt: `⭐ *Dr. {doctor}*-এর সাথে অভিজ্ঞতা কেমন ছিল?\n\n1-5 উত্তর দিন (5 = অসাধারণ)`,
    error: `😅 কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন বা *menu* লিখুন।`,
    typing: `_Medyzo ভাবছে..._`,
  },
  as: {
    welcome: `🌟 *Medyzo-লৈ আপোনাক স্বাগতম* — আপোনাৰ স্বাস্থ্য সহায়ক!\n\nআপোনাৰ ভাষা বাছনি কৰক:\n1️⃣ English\n2️⃣ Hindi\n3️⃣ Bengali\n4️⃣ অসমীয়া`,
    askName: `ধন্যবাদ! মই Medyzo 🩺\n\nআপোনাৰ *নাম* কি?`,
    askLocation: `ভেট হৈ ভাল লাগিল, *{name}*! 😊\n\nআপোনাৰ কাষৰ চিকিৎসক দেখুৱাবলৈ, আপুনি কোন *চহৰ বা ঠাইত* আছে?`,
    mainMenu: `নমস্কাৰ *{name}*! 👋 আজি কেনেকৈ সহায় কৰিব পাৰো?\n\n🔹 *1* — চিকিৎসক বিচাৰক\n🔹 *2* — মোৰ এপইণ্টমেন্ট\n🔹 *3* — দৰবৰ তথ্য\n🔹 *4* — স্বাস্থ্য পৰামৰ্শ\n🔹 *5* — AI সহায়কৰ সৈতে কথা পাতক`,
    doctorList: `📍 *{location}*-ৰ ওচৰৰ চিকিৎসক:\n\n{list}\n\nএপইণ্টমেন্ট বুক কৰিবলৈ চিকিৎসকৰ নম্বৰ লিখক।`,
    selectDate: `📅 আপুনি *Dr. {name}* ({specialty}) বাছনি কৰিছে\n\nতাৰিখ দিয়ক:\n_Format: DD-MM-YYYY_`,
    selectSlot: `🕐 *{date}*-ত উপলব্ধ সময়:\n\n{slots}\n\nস্লট নম্বৰ দিয়ক।`,
    bookingConfirmed: `✅ *এপইণ্টমেন্ট নিশ্চিত!*\n\n👨‍⚕️ চিকিৎসক: Dr. {doctor}\n🏥 ক্লিনিক: {clinic}\n📅 তাৰিখ: {date}\n🕐 সময়: {time}\n🔢 Token: *#{token}*`,
    bookingFull: `⚠️ দুঃখিত, *Dr. {name}*-ৰ {date}-ত কোনো স্লট নাই।\n\n1️⃣ আন তাৰিখ বাছক\n2️⃣ আন চিকিৎসক বাছক`,
    queueUpdate: `🔔 *Queue আপডেট*\n\n#{token} — আপোনাৰ পাল আহি আছে!\n⏱ অনুমানিত: *{eta} মিনিট*`,
    turnNow: `🚨 *আপোনাৰ পাল!*\n\nDr. {doctor} প্ৰস্তুত।\n🏥 *{clinic}*-লৈ আহক`,
    followUp: `✨ আশা কৰো ভাল হ'ল!\n\n1️⃣ Follow-up\n2️⃣ ৰিপোৰ্ট চাওক\n3️⃣ ৰিভিউ দিয়ক\n4️⃣ মেনুলৈ যাওক`,
    reviewPrompt: `⭐ *Dr. {doctor}*-ৰ সৈতে অভিজ্ঞতা কেনে আছিল?\n\n1-5 উত্তৰ দিয়ক`,
    error: `😅 কিবা সমস্যা হ'ল। পুনৰ চেষ্টা কৰক বা *menu* লিখক।`,
    typing: `_Medyzo ভাবিছে..._`,
  }
};

function t(lang, key, replacements = {}) {
  const base = STRINGS[lang]?.[key] || STRINGS['en'][key] || '';
  return Object.entries(replacements).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), base);
}

function detectLang(msg) {
  const m = msg.trim();
  if (m === '1') return 'en';
  if (m === '2') return 'hi';
  if (m === '3') return 'bn';
  if (m === '4') return 'as';
  return null;
}

module.exports = { STRINGS, t, detectLang };
