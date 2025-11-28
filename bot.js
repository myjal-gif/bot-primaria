const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

const WEBHOOK_URL = `https://bot-primaria-3.onrender.com/bot${TOKEN}`;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(WEBHOOK_URL);

const app = express();
app.use(express.json());

app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("🤖 Bot Comunicación Primaria Activo");
});

// ---------------------------------------------
// Detectar si la pregunta es del área de comunicación
// ---------------------------------------------
function esTemaComunicacion(texto) {
  texto = texto.toLowerCase();

  const claves = [
    "lectura", "leer", "texto", "comprensión", "resumen", "cuento",
    "historia", "párrafo", "oración", "vocabulario", "sinónimo",
    "antónimo", "definición", "ortografía", "escritura",
    "redacción", "expresión", "poema", "significado", "coherencia",
    "cohesión", "conectores"
  ];

  return claves.some(k => texto.includes(k));
}

// ---------------------------------------------
// Detectar si necesita respuesta larga
// ---------------------------------------------
function necesitaRespuestaLarga(texto) {
  return /tabla|lista|explica|desarrolla|completo|ejemplos|detallado/i.test(texto);
}

// ---------------------------------------------
// Limpiar tokens raros
// ---------------------------------------------
function limpiarTexto(texto) {
  return texto
    .replace(/<s>|<\/s>/g, "")
    .replace(/\[OST\]|\[\/OST\]/g, "")
    .trim();
}

// ---------------------------------------------
// Llamada a la IA
// ---------------------------------------------
async function obtenerRespuestaIA(mensaje, larga) {
  try {
    const systemPrompt = larga
      ? "Eres un asistente del área de Comunicación para primaria. Explica paso a paso, usa ejemplos simples y agrega emojis educativos 📘📝😊📚."
      : `Eres un asistente educativo EXCLUSIVO del área de Comunicación para primaria (lectura, comprensión, vocabulario, ortografía y escritura). Usa emojis y responde claro. Si la pregunta NO es del área de comunicación, responde: "Lo siento, solo tengo información del área de Comunicación. ❌"`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mensaje }
        ],
        max_tokens: larga ? 450 : 150,
        temperature: 0.6
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return limpiarTexto(response.data.choices[0].message.content);
  } catch (error) {
    console.log("ERROR OPENROUTER:", error.message);
    return "😢 Ocurrió un error al responder. Intenta más tarde.";
  }
}

// ---------------------------------------------
// BOTONES TEMÁTICOS
// ---------------------------------------------
function enviarBotonesTematicos(chatId) {
  bot.sendMessage(chatId, "📚 Elige un tema del área de Comunicación:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📖 Lectura", callback_data: "tema_lectura" },
          { text: "📝 Ortografía", callback_data: "tema_ortografia" }
        ],
        [
          { text: "🧠 Comprensión", callback_data: "tema_comprension" },
          { text: "🔤 Vocabulario", callback_data: "tema_vocabulario" }
        ],
        [
          { text: "✏️ Redacción", callback_data: "tema_redaccion" }
        ]
      ]
    }
  });
}

// ---------------------------------------------
// Manejo de botones
// ---------------------------------------------
bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  if (data === "tema_lectura")
    return bot.sendMessage(chatId, "📖 *Lectura:* La lectura nos ayuda a aprender y soñar. ¡Pregúntame algo! 😊", { parse_mode: "Markdown" });

  if (data === "tema_ortografia")
    return bot.sendMessage(chatId, "📝 *Ortografía:* Puedo ayudarte con reglas, tildes y ejemplos ✨📘", { parse_mode: "Markdown" });

  if (data === "tema_comprension")
    return bot.sendMessage(chatId, "🧠 *Comprensión:* Puedo ayudarte a entender textos y responder preguntas ✔️📚", { parse_mode: "Markdown" });

  if (data === "tema_vocabulario")
    return bot.sendMessage(chatId, "🔤 *Vocabulario:* Significados, sinónimos y antónimos 😄✨", { parse_mode: "Markdown" });

  if (data === "tema_redaccion")
    return bot.sendMessage(chatId, "✏️ *Redacción:* Te enseño a escribir oraciones claras y párrafos ✨📝", { parse_mode: "Markdown" });

  bot.answerCallbackQuery(query.id);
});

// ---------------------------------------------
// Manejo de mensajes normales
// ---------------------------------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;

  if (texto === "/start") {
    bot.sendMessage(chatId, "👋 ¡Hola! Soy tu asistente del área de *Comunicación* 📚✨\nElige un tema para comenzar:");
    return enviarBotonesTematicos(chatId);
  }

  if (!esTemaComunicacion(texto)) {
    return bot.sendMessage(
      chatId,
      "❌ Lo siento, solo tengo información del área de Comunicación.",
      { parse_mode: "Markdown" }
    );
  }

  const larga = necesitaRespuestaLarga(texto);

  bot.sendChatAction(chatId, "typing");

  const respuesta = await obtenerRespuestaIA(texto, larga);

  bot.sendMessage(chatId, respuesta);
});

// ---------------------------------------------
// PUERTO PARA RENDER
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("📡 Bot Comunicación online en puerto " + PORT);
});
