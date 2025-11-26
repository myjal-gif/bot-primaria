const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// =======================
//  CONFIGURACIÓN
// =======================

// 👉 Reemplaza con tu token real
const TOKEN = "8262198772:AAGjkEKdpe-99msWSHZL2W357j-j8puwmlM";

// 👉 Crea el bot en modo polling
const bot = new TelegramBot(TOKEN, { polling: true });

// =======================
//  RESPUESTA DE IA (OLLAMA)
// =======================
async function obtenerRespuestaIA(mensaje) {
    try {
        const response = await axios.post(
            "http://127.0.0.1:11434/api/generate",
            {
                model: "qwen2.5:1.5b",   // ⚡ Modelo muy rápido
                prompt: mensaje,
                stream: false,
                max_tokens: 80,          // Limita texto → más velocidad
                temperature: 0.3
            }
        );

        return response.data.response || "No pude generar respuesta.";
    } catch (error) {
        console.error("❌ Error al contactar con Ollama:", error.message);
        return "Hubo un error con la IA.";
    }
}

// =======================
//  MANEJO DE MENSAJES
// =======================
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "👋 Hola, soy el bot de primaria con IA. ¡Pregúntame algo!");
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const texto = msg.text;

    if (texto === "/start") return;

    console.log("📩 Mensaje recibido:", texto);

    const respuesta = await obtenerRespuestaIA(texto);

    bot.sendMessage(chatId, respuesta);
});

// =======================
//  BOT INICIADO
// =======================
console.log("🤖 Bot de primaria con IA iniciado correctamente...");
