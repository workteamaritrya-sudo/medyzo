# 🩺 Medyzo — AI Healthcare Assistant

WhatsApp-first healthcare booking system with Gemini AI + Clinic Admin Portal.

🌐 **Live Portal:** [https://medyzo.web.app](https://medyzo.web.app)  
🔥 **Firestore DB:** Project `medyzo-6ebbc`

---

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd e:\Vaidya.ai\medyzo
npm install
```

### 2. Configure Environment
```bash
copy .env.example .env
# Edit .env with your actual keys
```

Required keys:
| Variable | Where to get |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| `TWILIO_ACCOUNT_SID` | [twilio.com/console](https://twilio.com/console) |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` (sandbox) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts |
| `FIREBASE_DATABASE_URL` | `https://barak-residency-59405-default-rtdb.firebaseio.com` |

### 3. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Open project `barak-residency-59405`
3. Go to **Project Settings → Service Accounts**
4. Click **Generate new private key**
5. Save as `firebase-service-account.json` inside `medyzo/` folder

### 4. Start Server
```bash
npm run dev
```

### 5. Expose with ngrok (for Twilio)
```bash
# In another terminal:
npx ngrok http 3001
# Copy the https:// URL
```

### 6. Configure Twilio Sandbox
1. Go to [Twilio WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Set **Webhook URL**: `https://your-ngrok-url.ngrok.io/webhook/whatsapp`
3. Method: **HTTP POST**

### 7. Test on WhatsApp
Send `join <sandbox-word>` to **+1 415 523 8886**
Then start chatting!

---

## 📱 WhatsApp Flow

```
User → "Hi"
       ↓
Medyzo → Language Selection (En/Hi/Bn/As)
       ↓
Name → Location
       ↓
Main Menu:
  1. Find Doctor → List by location → Select → Date → Slot → Confirm ✅
  2. My Appointments
  3. Medicine Info (AI powered)
  4. Health Tips
  5. AI Chat Mode (Gemini)
       ↓
Post-consultation:
  Review → Follow-up → Reports
```

---

## 🏥 Admin Portal

Open: `http://localhost:3001`  
Login: `admin@medyzo.in` / `medyzo2026` (change in .env)

Features:
- **Dashboard**: Live stats, today's schedule
- **Live Queue**: Real-time patient flow, one-click advance → auto WhatsApp notifications
- **Appointments**: Filter, confirm, mark done, cancel
- **Doctors**: Add/edit doctors with full schedule, location, capacity
- **Clinic Settings**: Name, address, hours

---

## 🏗️ Architecture

```
medyzo/
├── server.js          # Express server (all routes)
├── src/
│   ├── whatsapp.js    # Conversation state machine
│   ├── gemini.js      # Gemini AI with conversation memory
│   ├── firebase.js    # All DB operations
│   ├── twilio.js      # WhatsApp sender
│   └── strings.js     # Multi-language strings
├── portal/
│   └── index.html     # Clinic admin dashboard (standalone)
├── .env.example
└── package.json
```

---

## 🔔 Queue Notifications (Auto)

When clinic staff clicks **"▶ Next"**:
1. Current patient → `"🚨 It's Your Turn! Dr. X is ready."`
2. Next patient → `"⏰ Get Ready! You're next in 10-15 min."`

Appointment reminders sent **30 minutes before** via cron job.

---

## 🌐 Production Deployment
- **Backend**: Deploy to [Railway.app](https://railway.app) or [Render.com](https://render.com)
- **Set env vars** in dashboard
- **Update Twilio webhook** to production URL
- **Firebase rules**: Set proper read/write rules
