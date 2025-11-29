const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

// Crear bot con webhook
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://bot-primaria-3.onrender.com/bot${TOKEN}`);

// Servidor Render
const app = express();
app.use(express.json());

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot educativo activo ✅🤖📚");
});

// =========================================================
//   BOTONES TEMÁTICOS
// =========================================================
function enviarBotonesTematicos(chatId) {
  const opciones = {
    reply_markup: {
      keyboard: [
        ["📖 Lectura", "📝 Redacción"],
        ["🔤 Vocabulario", "✍️ Ortografía"],
        ["📚 Tipos de textos"]
      ],
      resize_keyboard: true
    }
  };

  bot.sendMessage(
    chatId,
    "📚 Elige un tema del área de *Comunicación*: 👇",
    { ...opciones, parse_mode: "Markdown" }
  );
}

// =========================================================
//  DETECTOR DE TEMAS DE COMUNICACIÓN
// =========================================================
function esTemaComunicacion(texto) {
  texto = texto.toLowerCase();

  const claves = [
    "lectura", "leer", "texto", "comprensión", "comprender",
    "resumen", "cuento", "historia", "párrafo", "parrafo",
    "oración", "oracion", "vocabulario", "sinónimo", "antonimo",
    "significado", "ortografía", "ortografia", "tilde",
    "acentuación", "acentuacion", "escritura", "redacción",
    "redaccion", "coherencia", "cohesión", "cohesion",
    "conectores"
  ];

  return claves.some(clave => texto.includes(clave));
}

// =========================================================
//  IA (RESPUESTAS CON EMOJIS)
// =========================================================
async function obtenerRespuestaIA(mensaje) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `
Eres un asistente educativo para niños de primaria del área de Comunicación.
Responde de forma clara, divertida y fácil de entender.
Usa emojis adecuados al tema.
No des respuestas muy técnicas.
Incluye ejemplos simples.
            `
          },
          { role: "user", content: mensaje }
        ]
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
    console.error("❌ Error IA:", error);
    return "😢 Ocurrió un error al responder. Intenta nuevamente.";
  }
}

// =========================================================
//  MANEJO DE MENSAJES
// =========================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text?.toLowerCase().trim() || "";

  // ------------------------------
  // SALUDOS (solo exactos)
  // ------------------------------
  const saludos = ["hola", "hello", "hi", "buenas", "buenas tardes", "buenos dias"];
  if (saludos.includes(texto)) {
    bot.sendMessage(
      chatId,
      "👋 ¡Hola! Soy tu asistente del área de *Comunicación* 📚✨\n¿En qué tema deseas ayuda?",
      { parse_mode: "Markdown" }
    );
    return enviarBotonesTematicos(chatId);
  }

  // ------------------------------
  // AGRADECIMIENTOS
  // ------------------------------
  const agradecimientos = ["gracias", "muchas gracias", "gracias bot", "gracias!"];
  if (agradecimientos.includes(texto)) {
    return bot.sendMessage(
      chatId,
      "🙌 ¡De nada! Me alegra ayudarte.\nCuando necesites más ayuda, solo escríbeme *hola* y estaré aquí para ti 📚✨",
      { parse_mode: "Markdown" }
    );
  }

  // ------------------------------
  // /start
  // ------------------------------
  if (texto === "/start") {
    bot.sendMessage(
      chatId,
      "👋 ¡Bienvenido! Soy tu asistente del área de *Comunicación* 📚✨",
      { parse_mode: "Markdown" }
    );
    return enviarBotonesTematicos(chatId);
  }

  // ------------------------------
  // SI NO ES TEMA DE COMUNICACIÓN
  // ------------------------------
  if (!esTemaComunicacion(texto)) {
    return bot.sendMessage(
      chatId,
      "❌ Lo siento, solo tengo información del área de *Comunicación*. 📚\nElige un tema:",
      { parse_mode: "Markdown" }
    );
  }

  // ------------------------------
  // RESPUESTA IA
  // ------------------------------
  bot.sendChatAction(chatId, "typing");

  const respuesta = await obtenerRespuestaIA(texto);

  bot.sendMessage(chatId, respuesta);
});

// Puerto Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("📡 Bot online en puerto " + PORT);
});
