const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

// Crear bot
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://bot-primaria-3.onrender.com/bot${TOKEN}`);

// Servidor para Render
const app = express();
app.use(express.json());

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot educativo activo ✅🤖📚");
});

// FUNCIÓN IA MEJORADA
async function obtenerRespuestaIA(mensaje) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content: `
Eres un asistente educativo para niños de primaria.
Responde de forma clara, divertida y fácil de entender.
Usa emojis relacionados con lo que explicas.
No cortes la respuesta.
Explica paso a paso cuando sea necesario.
`
          },
          {
            role: "user",
            content: mensaje
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    return "😢 Ocurrió un error al responder. Intenta nuevamente.";
  }
}

// MENSAJES DEL USUARIO
bot.on("message", async (msg) => {
  if (!msg.text) return;

  bot.sendChatAction(msg.chat.id, "typing");

  const respuesta = await obtenerRespuestaIA(msg.text);

  bot.sendMessage(msg.chat.id, respuesta);
});

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("📡 Bot online en puerto " + PORT);
});
