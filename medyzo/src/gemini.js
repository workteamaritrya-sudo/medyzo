/**
 * MEDYZO — Gemini AI Module
 * Handles all conversational AI interactions
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'demo');

// System prompt for the Medyzo assistant
const SYSTEM_PROMPT = `You are Medyzo, a friendly and intelligent healthcare assistant for Indian users. 

PERSONALITY:
- Warm, empathetic, conversational (not robotic or clinical)
- Use simple, accessible language appropriate for general public
- Mix of professional medical knowledge + human warmth
- Use emojis sparingly but effectively

CAPABILITIES:
- Answer general health questions
- Explain symptoms with possible causes (always recommend consulting a doctor for serious issues)
- Provide medicine information: uses, side effects, food interactions, safety warnings
- Give diet and lifestyle advice
- Explain medical reports in simple terms
- Help with mental health support (with empathy)

IMPORTANT RULES:
1. NEVER diagnose diseases definitively — always say "this could be" or "you should consult a doctor"
2. For emergencies (chest pain, difficulty breathing, stroke signs) → immediately say "Please call 108 NOW"
3. Keep responses concise for WhatsApp (max 300 words)
4. If asked about booking/appointments → say "Type 1 to find a doctor"
5. Always end with a helpful follow-up question or suggestion
6. Respond in the SAME LANGUAGE the user writes in (auto-detect)
7. For medicine info, always include: uses, side effects, what to avoid, safety note

CONTEXT: You are operating via WhatsApp. Be conversational, not essay-like.`;

// In-memory conversation history per user (phone number)
const conversationHistory = new Map();

async function chatWithGemini(userPhone, userMessage, lang = 'en') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Get or init history
    if (!conversationHistory.has(userPhone)) {
      conversationHistory.set(userPhone, []);
    }
    const history = conversationHistory.get(userPhone);

    // Build chat with history
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'System instructions: ' + SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood! I am Medyzo, ready to help.' }] },
        ...history
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      }
    });

    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();

    // Save to history (keep last 10 exchanges to avoid token limits)
    history.push({ role: 'user', parts: [{ text: userMessage }] });
    history.push({ role: 'model', parts: [{ text: response }] });
    if (history.length > 20) history.splice(0, 2);
    conversationHistory.set(userPhone, history);

    return response;
  } catch (err) {
    console.error('[Gemini] Error:', err.message);
    // Fallback responses
    return getFallbackResponse(userMessage, lang);
  }
}

function clearHistory(userPhone) {
  conversationHistory.delete(userPhone);
}

function getFallbackResponse(message, lang) {
  const msg = message.toLowerCase();
  const responses = {
    en: {
      fever: `🌡️ For fever:\n• Rest and stay hydrated\n• Take Paracetamol (500mg) if above 38°C\n• Use a cold compress\n• If fever persists >3 days or above 40°C, see a doctor immediately.\n\nWould you like me to find a doctor near you?`,
      headache: `🤕 Common headache causes:\n• Dehydration → drink 2-3 glasses of water\n• Stress → try deep breathing\n• Screen time → take a break\n• Paracetamol or Ibuprofen can help\n\nPersistent headaches should be checked by a doctor.`,
      default: `I'm having trouble connecting right now 🙏\n\nYou can:\n• Type *menu* to see options\n• Type *1* to find a doctor\n• Call 108 for emergencies`
    }
  };
  if (msg.includes('fever')) return responses.en.fever;
  if (msg.includes('headache')) return responses.en.headache;
  return responses.en.default;
}

module.exports = { chatWithGemini, clearHistory };
