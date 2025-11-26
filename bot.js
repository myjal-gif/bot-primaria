const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

// Bot en modo webhook (ideal para Render)
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://bot-primaria-3.onrender.com/bot${TOKEN}`);


// Servidor express para Render
const express = require("express");
const app = express();
app.use(express.json());

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Endpoint para mantener vivo
app.get("/", (req, res) => {
  res.send("Bot activo ✅");
});

// IA con OpenRouter
async function obtenerRespuestaIA(mensaje) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: mensaje }]
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
    return "Error al conectar con la IA.";
  }
}

bot.on("message", async (msg) => {
  if (!msg.text) return;
  const respuesta = await obtenerRespuestaIA(msg.text);
  bot.sendMessage(msg.chat.id, respuesta);
});

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot online en puerto " + PORT);
});
