const {Sparky, isPublic,uploadMedia,handleMediaUpload} = require("../lib");
const {getString, appendMp3Data, convertToMp3, addExifToWebP, getBuffer, getJson} = require('./pluginsCore');
const googleTTS = require('google-tts-api');
const config = require('../config.js');
const lang = getString('converters');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

Sparky({
    name: "url",
    fromMe: true,
    desc: "",
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
    fromMe: true,
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
        fromMe: true,
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

Sparky({
    name: "tovn",
    fromMe: isPublic,
    desc: "Convert audio/video to voice note",
    category: "converters",
}, async ({ client, m, args }) => {
    try {
        if (!m.quoted) {
            return m.reply('_Reply to an audio or video message_');
        }
        
        // mtype is an array, get first element and convert to string
        const quotedType = Array.isArray(m.quoted.mtype) ? m.quoted.mtype[0] : String(m.quoted.mtype || '');
        
        console.log('tovn - quotedType:', quotedType);
        
        // Check if it's audio or video
        if (!quotedType.includes('audio') && !quotedType.includes('video') && !quotedType.includes('Audio') && !quotedType.includes('Video')) {
            return m.reply('_Please reply to an audio or video message. Detected: ' + quotedType + '_');
        }
        
        await m.react('🎤');
        
        // Download the media
        const mediaBuffer = await m.quoted.download();
        
        // Create temp files
        const tempDir = os.tmpdir();
        const inputFile = path.join(tempDir, `input_${Date.now()}.${quotedType.includes('video') ? 'mp4' : 'mp3'}`);
        const outputFile = path.join(tempDir, `output_${Date.now()}.ogg`);
        
        // Write input file
        fs.writeFileSync(inputFile, mediaBuffer);
        
        // Convert to opus ogg using ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .toFormat('ogg')
                .audioCodec('libopus')
                .audioChannels(1)
                .audioFrequency(48000)
                .on('end', resolve)
                .on('error', reject)
                .save(outputFile);
        });
        
        // Read converted file
        const audioBuffer = fs.readFileSync(outputFile);
        
        // Cleanup temp files
        try {
            fs.unlinkSync(inputFile);
            fs.unlinkSync(outputFile);
        } catch (e) {}
        
        // Send as voice note (ptt = push to talk)
        await client.sendMessage(m.jid, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, {
            quoted: m
        });
        
        await m.react('✅');
    } catch (error) {
        console.error('tovn error:', error);
        await m.react('❌');
        m.reply('_Failed to convert to voice note: ' + error.message + '_');
    }
});

Sparky({
    name: "toaudio",
    fromMe: isPublic,
    desc: "Convert video to audio",
    category: "converters",
}, async ({ client, m, args }) => {
    try {
        if (!m.quoted) {
            return m.reply('_Reply to a video message_');
        }
        
        // mtype is an array, get first element and convert to string
        const quotedType = Array.isArray(m.quoted.mtype) ? m.quoted.mtype[0] : String(m.quoted.mtype || '');
        
        if (!quotedType.includes('video') && !quotedType.includes('Video')) {
            return m.reply('_Please reply to a video message. Detected: ' + quotedType + '_');
        }
        
        await m.react('🎵');
        
        // Download the video
        const mediaBuffer = await m.quoted.download();
        
        // Create temp files
        const tempDir = os.tmpdir();
        const inputFile = path.join(tempDir, `input_${Date.now()}.mp4`);
        const outputFile = path.join(tempDir, `output_${Date.now()}.mp3`);
        
        // Write input file
        fs.writeFileSync(inputFile, mediaBuffer);
        
        // Convert to mp3 using ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .toFormat('mp3')
                .audioCodec('libmp3lame')
                .audioChannels(2)
                .audioBitrate('128k')
                .on('end', resolve)
                .on('error', reject)
                .save(outputFile);
        });
        
        // Read converted file
        const audioBuffer = fs.readFileSync(outputFile);
        
        // Cleanup temp files
        try {
            fs.unlinkSync(inputFile);
            fs.unlinkSync(outputFile);
        } catch (e) {}
        
        // Send as audio
        await client.sendMessage(m.jid, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg'
        }, {
            quoted: m
        });
        
        await m.react('✅');
    } catch (error) {
        console.error('toaudio error:', error);
        await m.react('❌');
        m.reply('_Failed to convert to audio: ' + error.message + '_');
    }
});
