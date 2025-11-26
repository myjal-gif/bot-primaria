const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

const bot = new TelegramBot(TOKEN);

// Webhook para Render
bot.setWebHook(`https://bot-primaria-3.onrender.com/bot${TOKEN}`);

// Servidor Express
const app = express();
app.use(express.json());

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Ruta raíz
app.get("/", (req, res) => {
  res.send("🤖 Bot activo y funcionando correctamente");
});

// ==========================
// FUNCIÓN IA CON RESPUESTAS CORTAS
// ==========================
async function obtenerRespuestaIA(mensaje) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content: "Responde de forma breve, clara y en máximo 3 líneas, con lenguaje sencillo para estudiantes."
          },
          {
            role: "user",
            content: mensaje
          }
        ],
        max_tokens: 80
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error IA:", error.message);
    return "❌ Hubo un problema al generar la respuesta.";
  }
}

// ==========================
// MENSAJES DEL BOT
// ==========================
bot.on("message", async (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id;

  // Mensaje de inicio
  if (msg.text === "/start") {
    return bot.sendMessage(
      chatId,
      "👋 Hola, soy tu bot educativo con IA.\nPregúntame lo que necesites 😊"
    );
  }

  const respuesta = await obtenerRespuestaIA(msg.text);
  bot.sendMessage(chatId, respuesta);
});

// ==========================
// PUERTO PARA RENDER
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Bot online en puerto " + PORT);
});
