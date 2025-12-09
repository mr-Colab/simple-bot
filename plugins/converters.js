const {Sparky, isPublic,uploadMedia,handleMediaUpload} = require("../lib");
const {getString, appendMp3Data, convertToMp3, addExifToWebP, getBuffer, getJson} = require('./pluginsCore');
const googleTTS = require('google-tts-api');
const config = require('../config.js');
const lang = getString('converters');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { toPTT, toAudio, toVideo } = require('../converter');

Sparky({
    name: "url",
    fromMe: isPublic,
    desc: "Upload media and get URL",
    category: "converters",
  }, async ({ args, m }) => {
    if (!m.quoted) {
      return m.reply('Reply to an Image/Video/Audio');
    }
    try {
        await m.react('⏫');
      const mediaBuffer = await m.quoted.download();
      const mediaUrl = await handleMediaUpload(mediaBuffer);
      await m.react('✅');
      m.reply(mediaUrl);
    } catch (error) {
        await m.react('❌');
      m.reply('An error occurred while uploading the media.');
    }
  });

Sparky(
  {
    name: "trt",
    fromMe: isPublic,
    desc: "Translate text to a given language",
    category: "converters",
  },
  async ({ client, m, args }) => {
    try {
      if (!args) return await m.reply('_Reply to any text with lang_\n_Eg : trt ml_');
      const trtxt = m.quoted?.text;
      const trtlang = args;
      const trt = await getJson(`${config.API}/api/search/translate?text=${trtxt}&lang=${trtlang}`)
      return m.reply(`${trt.result}`);
    } catch (e) {
      console.error(e);
    }
  }
);

Sparky(
    {
        name: "vv",
        fromMe: isPublic,
        category: "converters",
        desc: "Resends the view Once message"
    },
    async ({
        m, client 
    }) => {
        if (!m.quoted) {
            return m.reply("_Reply to ViewOnce Message !_");
        }
        try {
            m.react("⏫");
		let buff = await m.quoted.download();
		return await m.sendFile(buff);
        } catch (e) {
            return m.react("❌");
        } 
    });

Sparky({
		name: "sticker",
		fromMe: isPublic,
		category: "converters",
		desc: lang.STICKER_DESC
	},
	async ({
		m,
		args
	}) => {
		if (!m.quoted || !(m.quoted.message.imageMessage || m.quoted.message.videoMessage)) {
			return await m.reply(lang.STICKER_ALERT);
		}
		await m.react('⏫');
		await m.sendMsg(m.jid, await m.quoted.download(), {
			packName: args.split(';')[0] || config.STICKER_DATA.split(';')[0],
			authorName: args.split(';')[1] || config.STICKER_DATA.split(';')[1],
			quoted: m
		}, "sticker");
		return await m.react('✅');
	});


Sparky({
		name: "mp3",
		fromMe: isPublic,
		category: "converters",
		desc: lang.MP3_DESC
	},
	async ({
		m,
		args
	}) => {
		if (!m.quoted || !(m.quoted.message.audioMessage || m.quoted.message.videoMessage || (m.quoted.message.documentMessage && m.quoted.message.documentMessage.mimetype === 'video/mp4'))) {
			return await m.reply(lang.MP3_ALERT);
		}
		await m.react('⏫');
		await m.sendMsg(m.jid, await convertToMp3(await m.quoted.download()), { mimetype: "audio/mpeg", quoted: m }, 'audio');
		return await m.react('✅');
	});


Sparky({
		name: "take",
		fromMe: isPublic,
		category: "converters",
		desc: lang.TAKE_DESC
	},
	async ({
		m,
		args,
		client
	}) => {
		if (!m.quoted || !(m.quoted.message.stickerMessage || m.quoted.message.audioMessage || m.quoted.message.imageMessage || m.quoted.message.videoMessage)) return m.reply('reply to a sticker/audio');
		await m.react('⏫');
        if (m.quoted.message.stickerMessage || m.quoted.message.imageMessage || m.quoted.message.videoMessage) {
            args = args || config.STICKER_DATA;
            return await m.sendMsg(m.jid, await m.quoted.download(), {
			packName: `${args.split(';')[0]}` || `${config.STICKER_DATA.split(';')[0]}`,
			authorName: `${args.split(';')[1]}` || `${config.STICKER_DATA.split(';')[1]}`,
			quoted: m
		}, "sticker");
        } else if (m.quoted.message.audioMessage) {
            const opt = {
                title: args ? args.split(/[|,;]/) ? args.split(/[|,;]/)[0] : args : config.AUDIO_DATA.split(/[|,;]/)[0] ? config.AUDIO_DATA.split(/[|,;]/)[0] : config.AUDIO_DATA,
                body: args ? args.split(/[|,;]/)[1] : config.AUDIO_DATA.split(/[|,;]/)[1],
                image: (args && args.split(/[|,;]/)[2]) ? args.split(/[|,;]/)[2] : config.AUDIO_DATA.split(/[|,;]/)[2]
            }
            const Data = await AudioData(await convertToMp3(await m.quoted.download()), opt);
            return await m.sendMsg(m.jid ,Data,{
                mimetype: 'audio/mpeg'
            },'audio');
        }
		await m.react('✅');
	});


Sparky({
		name: "photo",
		fromMe: isPublic,
		category: "converters",
		desc: lang.PHOTO_DESC
	},
	async ({
		m
	}) => {
		if (!m.quoted || !m.quoted.message.stickerMessage || m.quoted.message.stickerMessage.isAnimated) {
			return await m.reply(lang.PHOTO_ALERT);
		}
		await m.react('⏫');
		await m.sendMsg(m.jid, await m.quoted.download(), {
			quoted: m
		}, "image");
		return await m.react('✅');
	});

	Sparky(
		{
			name: "tts",
			fromMe: isPublic,
			category: "converters",
			desc: "text to speech"
		},
		async ({
			m, client, args
		}) => {
			if (!args) {
				m.reply('_Enter Query!_')
			} else {
				let [txt,
					lang] = args.split`:`
				const audio = googleTTS.getAudioUrl(`${txt}`, {
					lang: lang || "ml",
					slow: false,
					host: "https://translate.google.com",
				})
				client.sendMessage(m.jid, {
					audio: {
						url: audio,
					},
					mimetype: 'audio/mpeg',
					ptt: false,
					fileName: `${'tts'}.mp3`,
				}, {
					quoted: m,
				})
	
			}
		});


Sparky(
		{
			name: "say",
			fromMe: isPublic,
			category: "converters",
			desc: "text to speech"
		},
		async ({
			m, client, args
		}) => {
			if (!args) {
				m.reply('_Enter Query!_')
			} else {
				let [txt,
					lang] = args.split`:`
				const audio = googleTTS.getAudioUrl(`${txt}`, {
					lang: lang || "en",
					slow: false,
					host: "https://translate.google.com",
				})
				client.sendMessage(m.jid, {
					audio: {
						url: audio,
					},
					mimetype: 'audio/mpeg',
					ptt: true,
					fileName: `${'tts'}.mp3`,
				}, {
					quoted: m,
				})
	
			}
		});

// ==================== TO VOICE NOTE (tovn) ====================
Sparky({
    name: "tovn|tovoice|toptt",
    fromMe: isPublic,
    desc: "Convert audio/video to voice note",
    category: "converters",
}, async ({ client, m, args }) => {
    try {
        if (!m.quoted) {
            return m.reply('*❌ Please reply to a video or audio message!*\n\n*Usage:* Reply to a video/audio with `.tovn`');
        }
        
        // Check if quoted message has audio or video
        const quotedType = Array.isArray(m.quoted.mtype) ? m.quoted.mtype[0] : String(m.quoted.mtype || '');
        const quotedTypeLower = quotedType.toLowerCase();
        
        if (!quotedTypeLower.includes('audio') && !quotedTypeLower.includes('video')) {
            return m.reply('*❌ Please reply to a video or audio message!*\n\n*Usage:* Reply to a video/audio with `.tovn`');
        }

        await m.react('⏳');

        // Download the media
        const mediaBuffer = await m.quoted.download();

        // Determine file extension based on media type
        const ext = quotedTypeLower.includes('video') ? 'mp4' : 'mp3';

        // Use converter.js toPTT function
        const audio = await toPTT(mediaBuffer, ext);

        await client.sendMessage(m.jid, {
            audio: audio,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: m });

        await m.react('✅');
    } catch (error) {
        console.error('ToVN error:', error);
        await m.react('❌');
        
        let errorMessage = '*❌ Failed to convert to voice note!*\n\n';
        errorMessage += `*Error:* ${error.message || 'Unknown error'}\n\nMake sure you replied to a video or audio message.`;
        
        await m.reply(errorMessage);
    }
});

// ==================== TO AUDIO (toaudio) ====================
Sparky({
    name: "toaudio|tomp3",
    fromMe: isPublic,
    desc: "Convert video to audio",
    category: "converters",
}, async ({ client, m, args }) => {
    try {
        if (!m.quoted) {
            return m.reply('*❌ Please reply to a video message!*\n\n*Usage:* Reply to a video with `.toaudio`');
        }
        
        // Check if quoted message has video
        const quotedType = Array.isArray(m.quoted.mtype) ? m.quoted.mtype[0] : String(m.quoted.mtype || '');
        const quotedTypeLower = quotedType.toLowerCase();
        
        if (!quotedTypeLower.includes('video')) {
            return m.reply('*❌ Please reply to a video message!*\n\n*Usage:* Reply to a video with `.toaudio`');
        }
        
        await m.react('⏳');
        
        // Download the video
        const mediaBuffer = await m.quoted.download();
        
        // Use converter.js toAudio function
        const audio = await toAudio(mediaBuffer, 'mp4');
        
        // Send as audio
        await client.sendMessage(m.jid, {
            audio: audio,
            mimetype: 'audio/mpeg'
        }, {
            quoted: m
        });
        
        await m.react('✅');
    } catch (error) {
        console.error('toaudio error:', error);
        await m.react('❌');
        m.reply('*❌ Failed to convert to audio!*\n\n*Error:* ' + error.message);
    }
});

// ==================== SEND AUDIO TO CHANNEL (chmp3) ====================
Sparky({
    name: "chmp3",
    fromMe: isPublic,
    desc: "Send replied audio to WhatsApp channel",
    category: "converters",
}, async ({ client, m, args }) => {
    try {
        // Check if args contains channel JID
        const channelJid = args ? args.trim() : null;
        
        if (!channelJid) {
            return m.reply('*❌ Please provide channel JID!*\n\n*Usage:* Reply to audio with `.chmp3 <channel_jid>`\n*Example:* `.chmp3 120363396379901844@newsletter`');
        }

        // Validate channel JID format
        if (!channelJid.endsWith('@newsletter')) {
            return m.reply('*❌ Invalid channel JID!*\n\nChannel JID must end with `@newsletter`');
        }

        if (!m.quoted) {
            return m.reply('*❌ Please reply to an audio message!*\n\n*Usage:* Reply to audio with `.chmp3 <channel_jid>`');
        }
        
        // Check if quoted message has audio
        const quotedType = Array.isArray(m.quoted.mtype) ? m.quoted.mtype[0] : String(m.quoted.mtype || '');
        const quotedTypeLower = quotedType.toLowerCase();
        
        if (!quotedTypeLower.includes('audio')) {
            return m.reply('*❌ Please reply to an audio message!*\n\n*Usage:* Reply to audio with `.chmp3 <channel_jid>`');
        }

        await m.react('⏳');

        // Download the audio
        const mediaBuffer = await m.quoted.download();

        // Determine file extension based on media type  
        const ext = 'mp3'; // Default to mp3 for audio files

        // Use converter.js toAudio function to ensure proper format
        const audioBuffer = await toAudio(mediaBuffer, ext);

        // Send audio to channel as voice note
        await client.sendMessage(channelJid, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: true
        });

        await m.react('✅');
        await m.reply(`*✅ Audio sent successfully to channel!*\n\n*Channel:* ${channelJid}`);

    } catch (error) {
        console.error('ChMp3 error:', error);
        await m.react('❌');
        
        let errorMessage = '*❌ Failed to send audio to channel!*\n\n';
        errorMessage += `*Error:* ${error.message || 'Unknown error'}\n\nMake sure:\n`;
        errorMessage += '1. You replied to an audio message\n';
        errorMessage += '2. Channel JID is correct\n';
        errorMessage += '3. Bot has permission to send messages to the channel';
        
        await m.reply(errorMessage);
    }
});
