// bot.js
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");

const TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API;

const WEBHOOK_URL = `https://bot-primaria-3.onrender.com/bot${TOKEN}`;

// Crear bot con webhook
const bot = new TelegramBot(TOKEN);
bot.setWebHook(WEBHOOK_URL);

// Servidor Express para Render
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
    "antónimo", "definición", "ortografía", "escritura", "escribir",
    "redacción", "mensaje", "expresión", "poema", "narrativo",
    "significado", "coherencia", "cohesión", "conectores"
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
      ? "Eres un asistente del área de Comunicación para primaria. Explica paso a paso, usa ejemplos simples y agrega emojis educativos como 📘📝😊📚."
      : `Eres un asistente ed
