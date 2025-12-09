const { Sparky, isPublic } = require("../lib");
const axios = require("axios");

const API_URL = "https://anabot.my.id/api/ai/suno";
const API_KEY = "freeApikey";

Sparky({
  name: "iasong",
  fromMe: isPublic,
  category: "ai",
  desc: "Generate AI songs using Suno AI. Format: .iasong <title> | <style> | <lyrics>"
}, async ({ m, client, args }) => {
  try {
    // Format expected: .iasong <title> | <style> | <lyrics>
    if (!args) {
      return await m.reply("❌ Format invalide.\nExemple: .iasong MonTitre | Pop, Rock | Voici mes paroles...");
    }

    const parts = args.split("|").map(p => p.trim());
    
    if (parts.length < 3) {
      return await m.reply("❌ Format invalide.\nExemple: .iasong MonTitre | Pop, Rock | Voici mes paroles...");
    }

    const [title, style, lyrics] = parts;

    await m.react("⏳");
    await m.reply(`🎶 Génération en cours...\nTitre: *${title}*\nStyle: *${style}*`);

    // API call
    const res = await axios.get(API_URL, {
      params: {
        lyrics,
        instrumen: "no",
        style,
        apikey: API_KEY
      },
      timeout: 60000
    });

    const data = res.data;
    
    if (!data.success || !data.data || !data.data.result || !data.data.result[0]) {
      return await m.reply("❌ Erreur API: " + (data.message || "Réponse invalide"));
    }

    const song = data.data.result[0];
    const audioUrl = song.audio_url;

    if (!audioUrl) {
      return await m.reply("❌ Audio URL manquant dans la réponse.");
    }

    // Download audio buffer
    const audioRes = await axios.get(audioUrl, { 
      responseType: "arraybuffer",
      timeout: 60000
    });
    const audioBuffer = Buffer.from(audioRes.data);

    // Send audio file
    await client.sendMessage(m.jid, {
      audio: audioBuffer,
      mimetype: "audio/mpeg",
      fileName: `${title}.mp3`,
      caption: `✅ *${title}*\nStyle: ${style}\nLyrics: ${lyrics.substring(0, 50)}...`
    }, { quoted: m });

    await m.react("☑️");
  } catch (err) {
    console.error("IASONG ERROR:", err);
    await m.react("❌");
    await m.reply("❌ Échec de génération de la chanson.");
  }
});
