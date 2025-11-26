const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

const bot = new TelegramBot(TOKEN);

// URL de tu bot en Render
const WEBHOOK_URL = `https://bot-primaria-3.onrender.com/bot${TOKEN}`;
bot.setWebHook(WEBHOOK_URL);

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
  res.send("🤖 Bot activo y funcionando correctamente");
});

// =======================
// IA INTELIGENTE CON CONTROL DE LONGITUD
// =======================
async function obtenerRespuestaIA(mensaje) {
  try {
    const esRespuestaLarga = /tabla|lista|explica|desarrolla|completo/i.test(mensaje);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content: esRespuestaLarga
              ? "Responde de forma clara y completa cuando se solicite una tabla o explicación larga."
              : "Responde de forma breve, clara y sin símbolos técnicos."
          },
          {
            role: "user",
            content: mensaje
          }
        ],
        max_tokens: esRespuestaLarga ? 400 : 80
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let texto = response.data.choices[0].message.content;

    // 🔥 Limpieza de símbolos raros
    texto = texto
      .replace(/<s>|<\/s>|\[OST\]|\[\/OST\]/g, "")
      .trim();

    return texto;
  } catch (error) {
    console.error("Error IA:", error.message);
    return "❌ Hubo un problema al generar la respuesta.";
  }
}

// =======================
// RESPUESTA DEL BOT
// =======================
bot.on("message", async (msg) => {
  if (!msg.text) return;

  const respuesta = await obtenerRespuestaIA(msg.text);
  bot.sendMessage(msg.chat.id, respuesta);
});

// =======================
// PUERTO PARA RENDER
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Bot online en puerto " + PORT);
});
