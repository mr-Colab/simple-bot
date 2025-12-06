const { Sparky, isPublic, spdl } = require("../lib");
const { getJson, extractUrlsFromText, getString, isUrl } = require("./pluginsCore");
const axios = require('axios');
const fetch = require('node-fetch');
const gis = require("g-i-s");
const config = require("../config.js");
const lang = getString('download');

// Constants for API URLs and headers
const FALLBACK_API_URL = 'https://dev-priyanshi.onrender.com/api/alldl';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const API_TIMEOUT = 30000;


Sparky(
    {
        name: "insta",
        fromMe: isPublic,
        desc: "Instagram media downloader - download images and videos from Instagram",
        category: "downloader",
    },
    async ({
        m, client, args
    }) => {
        args = args || m.quoted?.text;
        if (!args) return await m.reply(lang.NEED_URL);
        
        // Validate Instagram URL
        if (!args.includes('instagram.com') && !args.includes('instagr.am')) {
            return await m.reply('_Please provide a valid Instagram URL_');
        }
        
        try {
            await m.react('⬇️');
            
            // Try primary API
            try {
                let response = await getJson(config.API + "/api/downloader/igdl?url=" + args);
                for (let i of response.data) {
                    await m.sendMsg(m.jid, i.url, { quoted: m }, i.type)
                }
                await m.react('✅');
                return;
            } catch (primaryError) {
                console.log('Primary Instagram API failed, trying alternative...');
            }
            
            // Try alternative API
            const fallbackApiUrl = `${FALLBACK_API_URL}?url=${encodeURIComponent(args)}`;
            const response = await axios.get(fallbackApiUrl, {
                timeout: API_TIMEOUT,
                headers: {
                    'User-Agent': USER_AGENT
                }
            });
            
            if (response.data?.status && response.data.data) {
                const videoData = response.data.data;
                const videoUrl = videoData.high || videoData.low;
                
                if (videoUrl) {
                    await m.sendFromUrl(videoUrl, {
                        caption: videoData.title || 'Instagram Media'
                    });
                    await m.react('✅');
                } else {
                    throw new Error('No downloadable media found');
                }
            } else {
                throw new Error('Invalid API response');
            }
        } catch (e) {
            console.log(e);
            await m.react('❌');
            await m.reply('_Failed to download Instagram media. Please try again later._');
        }
    }
);

Sparky({
    name: "gpt",
    fromMe: true,
    category: "misc",
    desc: "Query GPT-3 with a prompt"
},
async ({ m, client, args }) => {
    // Get arguments either from command or quoted message
    args = args || m.quoted?.text;
    
    // Check if prompt exists
    if (!args) return await m.reply("Please provide a prompt or quote a message");
    
    try {
        // Make API request
        const q = await getJson(`${config.API}/api/search/gpt3?search=${encodeURIComponent(args)}`);
        
        // Check if response is valid
        if (!q?.data) throw new Error("Invalid API response");
        
        // Send the response
        return await m.reply(q.data);
    } catch (error) {
        console.error("GPT Error:", error);
        return await m.reply("An error occurred while processing your request");
    }
});
// Sparky({
//     name: "apk",
//     fromMe: isPublic,
//     category: "downloader",
//     desc: "Find and download APKs from Aptoide by app ID",
// },
// async ({
//     m, client, args
// }) => {
//     let appId = args || m.quoted?.text;
//     if (!appId) return await m.reply(lang.NEED_Q);

//     try {
//         await m.react('⬇️');

//         const { result: appInfo } = await getJson(AP + "download/aptoide?id=" + appId);
        
//         await client.sendMessage(m.jid, {
//             document: {
//                 url: appInfo.link
//             },
//             fileName: appInfo.appname,
//             caption: `App Name: ${appInfo.appname}\nDeveloper: ${appInfo.developer}`,
//             mimetype: "application/vnd.android.package-archive"
//         }, {
//             quoted: m
//         });
//         await m.react('✅');
//     } catch (error) {
//         await m.react('❌');
//         console.error(error);
//     }
// });

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

Sparky({
    name: "fb",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download files from Facebook by providing a valid URL",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_URL);
        
        // Validate Facebook URL
        if (!match.includes('facebook.com') && !match.includes('fb.com') && !match.includes('fb.watch')) {
            return await m.reply('_Please provide a valid Facebook URL_');
        }
        
        await m.react('⬇️');
        
        // Try primary API
        try {
            const data = await getJson(config.API + "/api/downloader/fbdl?url=" + match);
            await m.sendFromUrl(data.data.high || data.data.low, { caption: data.data.title });
            await m.react('✅');
            return;
        } catch (primaryError) {
            console.log('Primary Facebook API failed, trying alternative...');
        }
        
        // Try alternative API
        const fallbackApiUrl = `${FALLBACK_API_URL}?url=${encodeURIComponent(match)}`;
        const response = await axios.get(fallbackApiUrl, {
            timeout: API_TIMEOUT,
            headers: {
                'User-Agent': USER_AGENT
            }
        });
        
        if (response.data?.status && response.data.data) {
            const videoData = response.data.data;
            const videoUrl = videoData.high || videoData.low;
            
            if (videoUrl) {
                await m.sendFromUrl(videoUrl, {
                    caption: videoData.title || 'Facebook Video'
                });
                await m.react('✅');
            } else {
                throw new Error('No downloadable video found');
            }
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        await m.react('❌');
        console.error(error);
        return m.reply('_Failed to download Facebook video. Please try again later._');
    }
});

Sparky({
    name: "tiktok|tt",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download videos from TikTok by providing a valid URL",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_URL);
        
        // Validate TikTok URL
        if (!match.includes('tiktok.com') && !match.includes('vt.tiktok.com') && !match.includes('vm.tiktok.com')) {
            return await m.reply('_Please provide a valid TikTok URL_');
        }
        
        await m.react('⬇️');
        await m.reply('_Downloading TikTok video, please wait..._');
        
        // Try primary API
        try {
            const primaryApiUrl = `https://delirius-apiofc.vercel.app/download/tiktok?url=${encodeURIComponent(match)}`;
            const response = await axios.get(primaryApiUrl, { timeout: API_TIMEOUT });
            
            if (response.data?.status && response.data?.data) {
                const { title, author, meta } = response.data.data;
                const video = meta?.media?.find(v => v.type === "video");
                
                if (video?.org) {
                    const caption = `🎵 *TikTok Video*\n\n` +
                                  `👤 *User:* ${author?.nickname || 'Unknown'} (@${author?.username || 'unknown'})\n` +
                                  `📖 *Title:* ${title || 'TikTok Video'}`;
                    
                    await m.sendFromUrl(video.org, { caption });
                    await m.react('✅');
                    return;
                }
            }
        } catch (primaryError) {
            console.log('Primary TikTok API failed, trying alternative...');
        }
        
        // Try alternative API
        const fallbackApiUrl = `${FALLBACK_API_URL}?url=${encodeURIComponent(match)}`;
        const response = await axios.get(fallbackApiUrl, {
            timeout: API_TIMEOUT,
            headers: {
                'User-Agent': USER_AGENT
            }
        });
        
        if (response.data?.status && response.data.data) {
            const videoData = response.data.data;
            const videoUrl = videoData.high || videoData.low;
            
            if (videoUrl) {
                await m.sendFromUrl(videoUrl, {
                    caption: videoData.title || 'TikTok Video'
                });
                await m.react('✅');
            } else {
                throw new Error('No downloadable video found');
            }
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        await m.react('❌');
        console.error(error);
        return m.reply('_Failed to download TikTok video. Please try again later._');
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
