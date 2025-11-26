const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

// =======================
// BOT TELEGRAM (WEBHOOK)
// =======================
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://bot-primaria-3.onrender.com/bot${TOKEN}`);

// =======================
// SERVIDOR EXPRESS
// =======================
const app = express();
app.use(express.json());

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot activo ✅");
});

// =======================
// IA OPENROUTER FUNCIONAL
// =======================
async function obtenerRespuestaIA(mensaje) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: "Eres un asistente amigable para estudiantes de primaria." },
          { role: "user", content: mensaje }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://bot-primaria-3.onrender.com",
          "X-Title": "Bot Primaria Telegram",
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error("❌ ERROR OPENROUTER:", error.response?.data || error.message);
    return "⚠️ No pude conectar con la IA. Revisa tu API Key.";
  }
}

// =======================
// MENSAJES DEL BOT
// =======================
bot.on("message", async (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "🧠 Pensando...");
  const respuesta = await obtenerRespuestaIA(msg.text);

  bot.sendMessage(chatId, respuesta);
});

// =======================
// PUERTO RENDER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🤖 Bot online en puerto " + PORT);
});
