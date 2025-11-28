const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

// Crear bot
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`https://bot-primaria-3.onrender.com/bot${TOKEN}`);

// Crear servidor para Render
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
//   BOTONES TEMÁTICOS DE COMUNICACIÓN
// =========================================================
function enviarBotonesTematicos(chatId) {
  const opciones = {
    reply_markup: {
      keyboard: [
        ["📖 Lectura", "📝 Redacción"],
        ["🔤 Vocabulario", "✍️ Ortografía"],
        ["📚 Tipos de textos"]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };

  bot.sendMessage(
    chatId,
    "📚 Elige un tema del área de *Comunicación*: 👇",
    { ...opciones, parse_mode: "Markdown" }
  );
}


// =========================================================
//   DETECTOR DE TEMAS DE COMUNICACIÓN (MEJORADO)
// =========================================================
function esTemaComunicacion(texto) {
  texto = texto.toLowerCase();

  // Si menciona "comunicación", inmediatamente es válido
  if (texto.includes("comunicación") || texto.includes("comunicacion")) {
    return true;
  }

  const claves = [
    "lectura", "leer", "texto", "comprensión", "comprender",
    "resumen", "cuento", "historia", "párrafo", "parrafo",
    "oración", "oracion", "vocabulario", "sinónimo", "antonimo",
    "significado", "ortografía", "ortografia", "tilde",
    "acentuación", "acentuacion", "escritura", "redacción",
    "redaccion", "coherencia", "cohesión", "cohesion",
    "conectores"
  ];

  return claves.some(k => texto.includes(k));
}


// =========================================================
//   IA CON OPENROUTER (CON RESPUESTAS LARGAS O CORTAS)
// =========================================================
async function obtenerRespuestaIA(mensaje, largo = false) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        max_tokens: largo ? 600 : 350,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `
Eres un asistente educativo para niños de primaria del área de Comunicación.
Responde de forma clara, divertida y fácil de entender.
Usa emojis relacionados con lo que explicas.
No des respuestas muy técnicas.
Cuando sea útil, incluye ejemplos.
`
          },
          {
            role: "user",
            content: mensaje
          }
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
    console.error("Error IA:", error);
    return "😢 Ocurrió un error al responder. Intenta nuevamente.";
  }
}


// =========================================================
//   MANEJO DE MENSAJES
// =========================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text?.toLowerCase() || "";

  // ------------------------------
  // Respuestas a saludos
  // ------------------------------
  if (["hola", "hello", "hi", "buenas"].some(s => texto.includes(s))) {
    bot.sendMessage(
      chatId,
      "👋 ¡Hola! Soy tu asistente del área de *Comunicación* 📚✨\n¿En qué tema deseas ayuda?",
      { parse_mode: "Markdown" }
    );
    return enviarBotonesTematicos(chatId);
  }

  // ------------------------------
  // Comando /start
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
  // Botones presionados
  // ------------------------------
  const temasLargos = ["📖 lectura", "📝 redacción", "📚 tipos de textos"];
  const largo = temasLargos.some(t => texto.includes(t.toLowerCase()));

  // ------------------------------
  // Si NO es tema de comunicación
  // ------------------------------
  if (!esTemaComunicacion(texto)) {
    return bot.sendMessage(
      chatId,
      "❌ Lo siento, solo tengo información del área de *Comunicación*. 📚\nElige un tema:",
      { parse_mode: "Markdown" }
    );
  }

  // ------------------------------
  // RESPUESTA CON IA
  // ------------------------------
  bot.sendChatAction(chatId, "typing");

  const respuesta = await obtenerRespuestaIA(texto, largo);

  bot.sendMessage(chatId, respuesta);
});


// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("📡 Bot online en puerto " + PORT);
});
