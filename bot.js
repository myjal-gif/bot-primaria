// bot.js
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

// Cambia por tu URL de Render si es distinto
const WEBHOOK_BASE = `https://bot-primaria-3.onrender.com`;
const WEBHOOK_PATH = `/bot${TOKEN}`;
const WEBHOOK_URL = `${WEBHOOK_BASE}${WEBHOOK_PATH}`;

// Inicializar bot (webhook)
const bot = new TelegramBot(TOKEN);
bot.setWebHook(WEBHOOK_URL);

// Servidor Express
const app = express();
app.use(express.json());

app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("🤖 Bot educativo (Área: Comunicación) — Activo ✅");
});

// -----------------------------
// UTIL: detectar si la consulta es de Comunicación
// -----------------------------
function esTemaComunicacion(texto) {
  if (!texto) return false;
  texto = texto.toLowerCase();

  // Palabras clave típicas del área Comunicación (lectura, escritura, ortografía, gramática, vocabulario, redacción, comprensión, texto, párrafo, resumen, sinónimo, antónimo, conjugación simple, expresión oral)
  const claves = [
    "lectura", "leer", "texto", "comprensión", "comprende", "resumen", "resumir",
    "palabra", "vocabulario", "sinónimo", "antónimo", "definir", "definición",
    "ortografía", "escribir", "escritura", "redacción", "mensaje", "oral",
    "expresión", "expresar", "cuento", "historia", "párrafo", "oración",
    "gramática", "sintaxis", "significado", "pregunta de comprensión",
    "letra", "voz", "pronunciar", "guion", "diálogo", "comprensión lectora",
    "producción de textos", "producción", "texto narrativo", "poema", "poesía",
    "carácter", "cohesión", "coherencia", "conectores"
  ];

  return claves.some(k => texto.includes(k));
}

// -----------------------------
// UTIL: detectar si el usuario pide una respuesta larga (tabla / lista / explicar)
 // -----------------------------
function necesitaRespuestaLarga(texto) {
  if (!texto) return false;
  return /tabla|lista|explica|desarrolla|completo|detalla|enumerar|paso a paso|ejemplo|ejercicios|práctica/i.test(texto);
}

// -----------------------------
// UTIL: limpiar tokens raros de la IA
// -----------------------------
function limpiarTexto(texto) {
  if (!texto) return texto;
  return texto
    .replace(/<s>|<\/s>/g, "")
    .replace(/\[OST\]|\[\/OST\]/g, "")
    .replace(/\[.*?OST.*?\]/g, "")
    .trim();
}

// -----------------------------
// FUNCIÓN: obtener respuesta de OpenRouter (con prompt enfocado en Comunicación)
// -----------------------------
async function obtenerRespuestaIA(mensaje, esLarga = false) {
  try {
    // Prompt del sistema — muy específico para que la IA enfoque en comunicación de primaria y añada emojis
    const systemPrompt = esLarga
      ? `Eres un asistente educativo orientado exclusivamente al área de COMUNICACIÓN para estudiantes de primaria (ciclo I y II). Responde de forma clara, completa y paso a paso cuando te pidan tablas, listas o ejercicios. Usa un lenguaje sencillo y muchos ejemplos cortos. Agrega emojis relacionados (por ejemplo: 📘, ✏️, 📝, 📚, 😊) para hacerlo atractivo. NO incluyas etiquetas ni símbolos técnicos.`
      : `Eres un asistente educativo para niños de primaria en el área de COMUNICACIÓN. Responde breve (2-4 frases), clara, con ejemplos simples y con emojis relacionados. Si la pregunta no pertenece al área de Comunicación, responde exactamente: "Lo siento, sólo tengo información del área de Comunicación (lectura, escritura, ortografía, vocabulario y expresión). ❌"`;

    const maxTokens = esLarga ? 500 : 180;

    const payload = {
      model: "mistralai/mistral-7b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: mensaje }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    };

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          // agregar un header opcional para identificación (no obligatorio)
          "X-Source": "Bot-Primaria-Comunicacion"
        },
        timeout: 20000 // 20s timeout
      }
    );

    const contenido = response.data?.choices?.[0]?.message?.content || "";
    return limpiarTexto(contenido);
  } catch (error) {
    console.error("ERROR OPENROUTER:", error.response?.data || error.message || error);
    // Mensaje amigable para el niño/maestro
    return "😢 Lo siento, ahora mismo no puedo generar la respuesta. Intenta nuevamente en un momento.";
  }
}

// -----------------------------
// LÓGICA PRINCIPAL: recibir mensajes y filtrar por área
// -----------------------------
bot.on("message", async (msg) => {
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const texto = msg.text.trim();

  // Comando /start
  if (texto === "/start") {
    const saludo = "👋 ¡Hola! Soy el bot educativo del área de *Comunicación* 📚✏️\n" +
      "Puedo ayudar en: lectura, comprensión, ortografía, vocabulario, redacción y expresión oral. 😊\n" +
      "Escribe tu pregunta y te ayudaré.";
    return bot.sendMessage(chatId, saludo, { parse_mode: "Markdown" });
  }

  // Si no es tema de comunicación, responder que no tiene info
  if (!esTemaComunicacion(texto)) {
    const respuestaNo = "❌ Lo siento, solo tengo información del *área de Comunicación* (lectura, escritura, ortografía, vocabulario y expresión oral).";
    return bot.sendMessage(chatId, respuestaNo, { parse_mode: "Markdown" });
  }

  // Si es tema de comunicación: determinar si se necesita respuesta larga
  const larga = necesitaRespuestaLarga(texto);

  // Indicar que está escribiendo
  try {
    await bot.sendChatAction(chatId, "typing");
  } catch (e) {
    // no crítico si falla
  }

  // Obtener respuesta de IA enfocada
  const respuestaIA = await obtenerRespuestaIA(texto, larga);

  // Enriquecer la respuesta levemente (emojis temáticos adicionales si el modelo no puso)
  let respuestaFinal = respuestaIA;

  // Si la IA devolvió una respuesta demasiado corta para una petición larga, pedir que complete
  if (larga && respuestaFinal.length < 30) {
    // Intentar una segunda petición con instrucciones más directas (fallback)
    const fallbackPrompt = `${texto}\n\nPor favor da la respuesta completa, con formato de lista o tabla si corresponde, paso a paso y usando emojis.`;
    const fallback = await obtenerRespuestaIA(fallbackPrompt, true);
    if (fallback && fallback.length > respuestaFinal.length) {
      respuestaFinal = fallback;
    }
  }

  // Garantizar limpieza final
  respuestaFinal = limpiarTexto(respuestaFinal);

  // Enviar la respuesta
  bot.sendMessage(chatId, respuestaFinal);
});

// -----------------------------
// PUERTO PARA RENDER
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("📡 Bot (Área Comunicación) online en puerto " + PORT);
});
