const {
  Sparky,
  isPublic,
  YtInfo,
  yts,
  yta,
  ytv
} = require("../lib");
const { getString, isUrl, convertToMp3 } = require('./pluginsCore');
const fetch = require('node-fetch');
const axios = require('axios');
const config = require('../config.js');
const lang = getString('download');

// Neoxr API Key from config
const NEOXR_API_KEY = config.NEOXR_API_KEY;


Sparky({
  name: "yts",
  fromMe: isPublic,
  category: "youtube",
  desc: "search in youtube"
}, async ({ m, client, args }) => {
  if (!args) return await m.reply(lang.NEED_Q);
  if (await isUrl(args)) {
    const yt = await YtInfo(args);
    return await client.sendMessage(m.jid, { image: { url: yt.thumbnail }, caption: "*title :* " + yt.title + "\n*author :* " + yt.author + "\n*url :* " + args + "\n*video id :* " + yt.videoId });
  } else {
    const videos = await yts(args);
    const result = videos.map(video => `*🏷️ Title :* _*${video.title}*_\n*📁 Duration :* _${video.duration}_\n*🔗 Link :* _${video.url}_`);
    return await m.reply(`\n\n_*Result Of ${args} 🔍*_\n\n` + result.join('\n\n'))
  }
});

Sparky({
  name: "ytv",
  fromMe: isPublic,
  category: "youtube",
  desc: "Find details of a song"
},
  async ({
    m, client, args
  }) => {
    try {
      args = args || m.quoted?.text;
      if (!args) return await m.reply(lang.NEED_URL);
      if (!await isUrl(args)) return await m.reply(lang.INVALID_LINK);
      await m.react('⬇️');
      const url = await ytv(args);
      await m.sendMsg(m.jid, url, { quoted: m }, "video")
      await m.react('✅');
    } catch (error) {
      await m.react('❌');
      m.reply(error);
    }
  });

Sparky({
  name: "yta",
  fromMe: isPublic,
  category: "youtube",
  desc: "Find details of a song"
},
  async ({
    m, client, args
  }) => {
    try {
      args = args || m.quoted?.text;
      if (!args) return await m.reply(lang.NEED_URL);
      if (!await isUrl(args)) return await m.reply(lang.INVALID_LINK);
      await m.react('⬇️');
      const url = await yta(args);
      await m.sendMsg(m.jid, url, { quoted: m, mimetype: 'audio/mpeg' }, "audio");
      await m.react('✅');
    } catch (error) {
      await m.react('❌');
      m.reply(error);
    }
  });

Sparky({
  name: "play",
  fromMe: isPublic,
  category: "youtube",
  desc: "play a song"
},
  async ({
    m, client, args
  }) => {
    try {
      args = args || m.quoted?.text;
      if (!args) return await m.reply(lang.NEED_Q);
      await m.react('🔎');
      const play = (await yts(args))[0]
      await m.react('⬇️');
      await m.reply(`Downloading ${play.title}`)
      const url = await yta(play.url);
      await m.sendMsg(m.jid, url, { quoted: m, mimetype: 'audio/mpeg' }, "audio");
      await m.react('✅');
    } catch (error) {
      await m.react('❌');
      m.reply(error);
    }
  });

Sparky({
  name: "song",
  fromMe: isPublic,
  category: "youtube",
  desc: "play a song"
},
  async ({
    m, client, args
  }) => {
    try {
      args = args || m.quoted?.text;
      if (!args) return await m.reply(lang.NEED_Q);
      await m.react('🔎');
      const play = (await yts(args))[0]
      await m.react('⬇️');
      await m.reply(`Downloading ${play.title}`)
      const url = await yta(play.url);
      await m.sendMsg(m.jid, url, { quoted: m, mimetype: 'audio/mpeg' }, "audio");
      await m.react('✅');
    } catch (error) {
      await m.react('❌');
      m.reply(error);
    }
  });

// ==================== YOUTUBE MP3 DOWNLOAD (Neoxr API) ====================
Sparky({
  name: "ytmp3",
  fromMe: isPublic,
  category: "youtube",
  desc: "Download YouTube audio as MP3"
}, async ({ m, client, args }) => {
  try {
    const url = args || m.quoted?.text;
    
    if (!url) {
      return await m.reply('🎵 *YouTube MP3 Downloader*\n\nPlease provide a YouTube URL.\nExample: .ytmp3 https://youtube.com/watch?v=xxxxx');
    }

    // Validate YouTube URL using URL parsing for security
    let isValidYouTube = false;
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      isValidYouTube = hostname === 'youtube.com' || hostname === 'www.youtube.com' || 
                       hostname === 'youtu.be' || hostname === 'm.youtube.com';
    } catch (e) {
      isValidYouTube = false;
    }
    
    if (!isValidYouTube) {
      return await m.reply('❌ *Invalid YouTube URL*\nPlease provide a valid YouTube URL.');
    }

    await m.react('⏳');
    await m.reply('🎵 _Downloading audio... Please wait._');

    const apiUrl = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(url)}&type=audio&quality=128kbps&apikey=${NEOXR_API_KEY}`;
    const response = await axios.get(apiUrl, {
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.data?.status || !response.data.data) {
      throw new Error('Invalid API response');
    }

    const audioData = response.data.data;
    const audioUrl = audioData.url;

    if (!audioUrl) {
      throw new Error('No downloadable audio found');
    }

    // Download audio
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 180000
    });

    const audioBuffer = Buffer.from(audioResponse.data, 'binary');

    // Send audio using sendMsg like the play command
    await m.sendMsg(m.jid, audioBuffer, { quoted: m, mimetype: 'audio/mpeg' }, "audio");

    await m.react('✅');
  } catch (error) {
    console.error('YouTube MP3 Command Error:', error);
    await m.react('❌');
    await m.reply(`❌ Error: ${error.message || 'Failed to download YouTube audio'}`);
  }
});

// ==================== YOUTUBE MP4 DOWNLOAD (Neoxr API) ====================
Sparky({
  name: "ytmp4",
  fromMe: isPublic,
  category: "youtube",
  desc: "Download YouTube video as MP4"
}, async ({ m, client, args }) => {
  try {
    const url = args || m.quoted?.text;
    
    if (!url) {
      return await m.reply('🎬 *YouTube MP4 Downloader*\n\nPlease provide a YouTube URL.\nExample: .ytmp4 https://youtube.com/watch?v=xxxxx');
    }

    // Validate YouTube URL using URL parsing for security
    let isValidYouTube = false;
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      isValidYouTube = hostname === 'youtube.com' || hostname === 'www.youtube.com' || 
                       hostname === 'youtu.be' || hostname === 'm.youtube.com';
    } catch (e) {
      isValidYouTube = false;
    }
    
    if (!isValidYouTube) {
      return await m.reply('❌ *Invalid YouTube URL*\nPlease provide a valid YouTube URL.');
    }

    await m.react('⏳');
    await m.reply('🎬 _Downloading video... Please wait._');

    const apiUrl = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(url)}&type=video&quality=720p&apikey=${NEOXR_API_KEY}`;
    const response = await axios.get(apiUrl, {
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.data?.status || !response.data.data) {
      throw new Error('Invalid API response');
    }

    const videoData = response.data.data;
    const videoUrl = videoData.url;

    if (!videoUrl) {
      throw new Error('No downloadable video found');
    }

    // Download video
    const videoResponse = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 300000
    });

    const videoBuffer = Buffer.from(videoResponse.data, 'binary');
    const caption = `🎬 *${videoData.title || 'YouTube Video'}*\n🌐 *Source:* YouTube`;

    await client.sendMessage(m.jid, {
      video: videoBuffer,
      caption: caption
    }, { quoted: m });

    await m.react('✅');
  } catch (error) {
    console.error('YouTube MP4 Command Error:', error);
    await m.react('❌');
    await m.reply(`❌ Error: ${error.message || 'Failed to download YouTube video'}`);
  }
});