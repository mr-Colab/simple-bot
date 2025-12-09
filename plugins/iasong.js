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
      return await m.reply("❌ Invalid format.\nExample: .iasong MyTitle | Pop, Rock | Here are my lyrics...");
    }

    const parts = args.split("|").map(p => p.trim());
    
    if (parts.length < 3) {
      return await m.reply("❌ Invalid format.\nExample: .iasong MyTitle | Pop, Rock | Here are my lyrics...");
    }

    const [title, style, lyrics] = parts;

    await m.react("⏳");
    await m.reply(`🎶 Generating song...\nTitle: *${title}*\nStyle: *${style}*`);

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
      return await m.reply("❌ API Error: " + (data.message || "Invalid response"));
    }

    const song = data.data.result[0];
    const audioUrl = song.audio_url;

    if (!audioUrl) {
      return await m.reply("❌ Audio URL missing in response.");
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
    await m.reply("❌ Failed to generate song.");
  }
});
