const { Sparky, isPublic, spdl } = require("../lib");
const { getJson, extractUrlsFromText, getString, isUrl } = require("./pluginsCore");
const axios = require('axios');
const fetch = require('node-fetch');
const gis = require("g-i-s");
const config = require("../config.js");
const lang = getString('download');

// ==================== INSTAGRAM DOWNLOAD ====================
Sparky({
    name: "ig|insta|instagram",
    fromMe: isPublic,
    desc: "Instagram media downloader with quality options",
    category: "downloader",
}, async ({ m, client, args }) => {
    try {
        const url = args || m.quoted?.text;
        
        if (!url) {
            return await m.reply('📸 *Instagram Downloader*\n\nPlease provide an Instagram URL.\nExample: .ig https://instagram.com/reel/ABC123/');
        }

        // Validate Instagram URL
        if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
            return await m.reply('❌ *Invalid Instagram URL*\nPlease provide a valid Instagram URL.');
        }

        await m.react('⏳');

        const apiUrl = `https://dev-priyanshi.onrender.com/api/alldl?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data?.status || !response.data.data) {
            throw new Error('Invalid API response');
        }

        const videoData = response.data.data;
        const videoUrl = videoData.high || videoData.low;

        if (!videoUrl) {
            throw new Error('No downloadable media found');
        }

        // Download and send
        const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        const videoBuffer = Buffer.from(videoResponse.data, 'binary');
        const caption = `📸 *${videoData.title || 'Instagram Media'}*\n🌐 *Source:* Instagram`;

        await client.sendMessage(m.jid, {
            video: videoBuffer,
            caption: caption
        }, { quoted: m });

        await m.react('✅');
    } catch (error) {
        console.error('Instagram Command Error:', error);
        await m.react('❌');
        await m.reply(`❌ Error: ${error.message || 'Failed to process Instagram media'}`);
    }
});

// ==================== AI/GPT COMMAND ====================
Sparky({
    name: "ai|ask|gpt",
    fromMe: isPublic,
    category: "misc",
    desc: "AI assistant powered by Aria API"
}, async ({ m, client, args }) => {
    try {
        const question = args || m.quoted?.text;
        
        if (!question || question.length < 2) {
            return await m.reply('🤖 *AI Assistant*\n\nPlease provide a question or message.\nExample: .ai What is artificial intelligence?');
        }

        await m.react('⏳');

        // Aria API configuration
        const ARIA_API = "https://kaiz-apis.gleeze.com/api/aria";
        const API_KEY = "cf2ca612-296f-45ba-abbc-473f18f991eb";

        // Get user ID for context
        const userId = m.jid.split('@')[0];

        // Build API URL
        const apiUrl = `${ARIA_API}?ask=${encodeURIComponent(question)}&uid=${userId}&apikey=${API_KEY}`;

        // Call Aria API
        const response = await axios.get(apiUrl, { 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const ariaData = response.data;

        if (!ariaData || !ariaData.response) {
            throw new Error('No response from AI API');
        }

        // Format the response
        let formattedResponse = ariaData.response;

        // Truncate if too long (WhatsApp message limit)
        if (formattedResponse.length > 3500) {
            formattedResponse = formattedResponse.substring(0, 3500) + '...\n\n*Response truncated due to length*';
        }

        // Send the AI response
        await m.reply(`🤖 *AI Response*\n\n${formattedResponse}`);

        await m.react('✅');

    } catch (error) {
        console.error('AI Command Error:', error);
        await m.react('❌');
        await m.reply(`❌ Error: ${error.message || 'Failed to get AI response. Please try again.'}`);
    }
});

// ==================== APK DOWNLOADER ====================
Sparky({
    name: "apk|modapk|apkdownload",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download APK files by app name"
}, async ({ m, client, args }) => {
    try {
        const appName = args || m.quoted?.text;
        
        if (!appName) {
            return await m.reply('📦 *APK Downloader*\n\nPlease provide an app name.\nExample: .apk whatsapp');
        }

        await m.react('⏳');

        // Prepare the NexOracle API URL
        const apiUrl = `https://api.nexoracle.com/downloader/apk`;
        const params = {
            apikey: 'free_key@maher_apis',
            q: appName.trim()
        };

        // Call the NexOracle API
        const response = await axios.get(apiUrl, { params, timeout: 15000 });

        // Check if the API response is valid
        if (!response.data || response.data.status !== 200 || !response.data.result) {
            throw new Error('Unable to find the APK');
        }

        // Extract the APK details
        const { name, lastup, package: pkg, size, icon, dllink } = response.data.result;

        // Send app info with thumbnail
        await client.sendMessage(m.jid, {
            image: { url: icon },
            caption: `📦 *Downloading ${name}... Please wait.*`
        }, { quoted: m });

        // Download the APK file
        const apkResponse = await axios.get(dllink, { 
            responseType: 'arraybuffer',
            timeout: 30000
        });

        if (!apkResponse.data) {
            throw new Error('Failed to download the APK');
        }

        const apkBuffer = Buffer.from(apkResponse.data, 'binary');

        // Prepare the message with APK details
        const message = `📦 *APK Details:*\n\n` +
          `🔖 *Name:* ${name}\n` +
          `📅 *Last Updated:* ${lastup}\n` +
          `📦 *Package:* ${pkg}\n` +
          `📏 *Size:* ${size}`;

        // Send the APK file as a document
        await client.sendMessage(m.jid, {
            document: apkBuffer,
            mimetype: 'application/vnd.android.package-archive',
            fileName: `${name}.apk`,
            caption: message
        }, { quoted: m });

        await m.react('✅');

    } catch (error) {
        console.error('APK Command Error:', error);
        await m.react('❌');
        await m.reply(`❌ Error: ${error.message || 'Unable to fetch APK details'}`);
    }
});

Sparky(
    {
        name: "img",
        fromMe: isPublic,
        desc: "Google Image search",
        category: "downloader",
    },
    async ({
        m, client, args
    }) => {
        try {
            async function gimage(query, amount = 5) {
                let list = [];
                return new Promise((resolve, reject) => {
                    gis(query, async (error, result) => {
                        for (
                            var i = 0;
                            i < (result.length < amount ? result.length : amount);
                            i++
                        ) {
                            list.push(result[i].url);
                            resolve(list);
                        }
                    });
                });
            }
            if (!args) return await m.reply("Enter Query,Number");
            let [query,
                amount] = args.split(",");
            let result = await gimage(query, amount);
            await m.reply(
                `_Downloading ${amount || 5} images for ${query}_`
            );
            for (let i of result) {
                await m.sendMsg(m.jid, i, {}, "image")
            }

        } catch (e) {
            console.log(e)
        }
    }
);

Sparky({
    name: "pintrest",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download images and content from Pinterest",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_URL);
        await m.react('⬇️');
        //if (!match.includes("pin.it")) return await m.reply("_Please provide a valid Pinterest URL_");
        const result = await getJson(config.API + "/api/downloader/pin?url=" + match);
        await m.sendFromUrl(result.data.url, { caption: result.data.created_at });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});

// ==================== FACEBOOK DOWNLOAD ====================
Sparky({
    name: "fb|facebook|fbvideo",
    fromMe: isPublic,
    category: "downloader",
    desc: "Facebook video downloader with quality options",
}, async ({ m, client, args }) => {
    try {
        const url = args || m.quoted?.text;
        
        if (!url) {
            return await m.reply('📥 *Facebook Video Downloader*\n\nPlease provide a Facebook video URL.\nExample: .fb https://facebook.com/share/v/16rHWGkeet/');
        }

        // Validate Facebook URL
        if (!url.includes('facebook.com') && !url.includes('fb.com') && !url.includes('fb.watch')) {
            return await m.reply('❌ *Invalid Facebook URL*\nPlease provide a valid Facebook video URL.');
        }

        await m.react('⏳');

        const apiUrl = `https://dev-priyanshi.onrender.com/api/alldl?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data?.status || !response.data.data) {
            throw new Error('Invalid API response');
        }

        const videoData = response.data.data;
        const videoUrl = videoData.high || videoData.low;

        if (!videoUrl) {
            throw new Error('No downloadable video found');
        }

        // Download and send
        const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        const videoBuffer = Buffer.from(videoResponse.data, 'binary');
        const caption = `📥 *${videoData.title || 'Facebook Video'}*\n🌐 *Source:* Facebook`;

        await client.sendMessage(m.jid, {
            video: videoBuffer,
            caption: caption
        }, { quoted: m });

        await m.react('✅');
    } catch (error) {
        console.error('Facebook Command Error:', error);
        await m.react('❌');
        await m.reply(`❌ Error: ${error.message || 'Failed to process Facebook video'}`);
    }
});

// ==================== TIKTOK DOWNLOAD ====================
Sparky({
    name: "tiktok|tt",
    fromMe: isPublic,
    category: "downloader",
    desc: "TikTok video downloader",
}, async ({ m, client, args }) => {
    try {
        const url = args || m.quoted?.text;
        
        if (!url) {
            return await m.reply('🎵 *TikTok Downloader*\n\nPlease provide a TikTok URL.\nExample: .tiktok https://tiktok.com/@user/video/123456789');
        }

        // Validate TikTok URL
        if (!url.includes('tiktok.com') && !url.includes('vt.tiktok.com') && !url.includes('vm.tiktok.com')) {
            return await m.reply('❌ *Invalid TikTok URL*\nPlease provide a valid TikTok URL.');
        }

        await m.react('⏳');

        const apiUrl = `https://dev-priyanshi.onrender.com/api/alldl?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data?.status || !response.data.data) {
            throw new Error('Invalid API response');
        }

        const videoData = response.data.data;
        const videoUrl = videoData.play || videoData.high || videoData.low;

        if (!videoUrl) {
            throw new Error('No downloadable video found');
        }

        // Download and send
        const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        const videoBuffer = Buffer.from(videoResponse.data, 'binary');
        const caption = `🎵 *${videoData.title || 'TikTok Video'}*\n` +
                       `👤 *Creator:* ${videoData.author || 'Unknown'}\n` +
                       `🌐 *Source:* TikTok`;

        await client.sendMessage(m.jid, {
            video: videoBuffer,
            caption: caption
        }, { quoted: m });

        await m.react('✅');
    } catch (error) {
        console.error('TikTok Command Error:', error);
        await m.react('❌');
        await m.reply(`❌ Error: ${error.message || 'Failed to process TikTok video'}`);
    }
});

Sparky({
    name: "spotify",
    fromMe: isPublic,
    category: "downloader",
    desc: "play a song"
  },
  async ({
    m, client, args
  }) => {
    try {
        args = args || m.quoted?.text;
        if(!args) return await m.reply(lang.NEED_Q);
  await m.react('🔎');
  const ser = await getJson(config.API + "/api/search/spotify?search=" + args)
  const play = ser.data[0];
        await m.react('⬇️');
        await m.reply(`_Downloading ${play.name} By ${play.artists}_`)
  const url = await spdl(play.link);
  await m.sendMsg(m.jid , url, { mimetype: "audio/mpeg" } , "audio")
   await m.react('✅');     
    } catch (error) {
        await m.react('❌');
        m.reply(error);
    }
  });

  Sparky({
    name: "spotifydl",
    fromMe: isPublic,
    category: "downloader",
    desc: "play a song"
  },
  async ({
    m, client, args
  }) => {
    try {
        args = args || m.quoted?.text;
        if(!args) return await m.reply(lang.NEED_URL);
        await m.react('⬇️');
  const url = await spdl(args);
  await m.sendMsg(m.jid , url, { mimetype: "audio/mpeg" } , "audio")
   await m.react('✅');     
    } catch (error) {
        await m.react('❌');
        m.reply(error);
    }
  });

Sparky({
    name: "xnxx",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download media from XNXX by search or URL",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_Q);
            await m.react('🔎');
            const { result } = await getJson(config.API + "/api/search/xnxx?search=" + match);
            await m.react('⬇️');
            var xnxx = result.result[0].link
            const xdl = await getJson(`${config.API}/api/downloader/xnxx?url=${xnxx}`)
            await m.sendFromUrl(xdl.data.files.high, { caption: xdl.data.title });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        m.reply(error);
    }
});


Sparky({
    name: "terabox",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download files from TeraBox by providing a valid URL",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_URL);
        await m.react('⬇️');
        const { data } = await getJson(config.API + "/api/downloader/terrabox?url=" + match);
        await m.sendFromUrl(data.dlink, { caption: data.filename });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});


Sparky({
    name: "gitclone",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download GitHub repositories as ZIP files",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!isUrl(match)) return await m.reply(lang.NEED_URL)
        await m.react('⬇️');
        let user = match.split("/")[3];
        let repo = match.split("/")[4];
        const msg = await m.reply(lang.DOWNLOADING);
        await client.sendMessage(m.jid, {
            document: {
                url: `https://api.github.com/repos/${user}/${repo}/zipball`
            },
            fileName: repo,
            mimetype: "application/zip"
        }, {
            quoted: m
        });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});
