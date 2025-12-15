const { Sparky, isPublic } = require("../lib");
const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');

// Movie API base URL
const MOVIE_API_BASE = 'https://fs-miroir13.lol';

// Download timeout (10 minutes)
const DOWNLOAD_TIMEOUT = 10 * 60 * 1000;

// Store active movie sessions for interactive selection
const movieSessions = new Map();

// Session timeout (5 minutes)
const SESSION_TIMEOUT = 5 * 60 * 1000;

/**
 * Search for movies by query
 * @param {string} query - Search query
 * @param {number} page - Page number for pagination
 * @returns {Promise<Array>} Array of search results
 */
async function searchMovies(query, page = 1) {
    const data = qs.stringify({ query, page });
    const res = await axios.post(`${MOVIE_API_BASE}/engine/ajax/search.php`, data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
    });
    const $ = cheerio.load(res.data);
    const result = [];

    $('.search-item').each((i, el) => {
        const url = $(el).attr('onclick')?.match(/'([^']+)'/)?.[1];
        result.push({
            title: $(el).find('.search-title').text().trim(),
            thumbnail: $(el).find('img').attr('src'),
            url: url ? `${MOVIE_API_BASE}${url}` : null
        });
    });
    return result;
}

/**
 * Check if a URL/title indicates a TV series
 * @param {string} url - URL to check
 * @param {string} title - Title to check
 * @returns {boolean} True if it's a series
 */
function isSeries(url, title) {
    const seriesIndicators = ['saison', 'season', 'série', 'series'];
    const lowerUrl = (url || '').toLowerCase();
    const lowerTitle = (title || '').toLowerCase();
    return seriesIndicators.some(ind => lowerUrl.includes(ind) || lowerTitle.includes(ind));
}

/**
 * Get series details including episodes from a series page URL
 * @param {string} url - Series page URL
 * @returns {Promise<Object>} Series details with episodes
 */
async function getSeriesDetail(url) {
    const html = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
    });
    const $ = cheerio.load(html.data);

    const title = $('#s-list li').first().text().replace('Titre Original:', '').trim() || 
                  $('title').text().replace(/série|en streaming.*$/gi, '').trim();
    const genres = $('#s-list li:contains("Genre:") a').map((i, el) => $(el).text().trim()).get();
    const actors = $('#s-list li:contains("Acteurs:") a').map((i, el) => $(el).text().trim()).get();
    const version = $('li:contains("Version:") a').text().trim();
    const quality = $('li:contains("Qualité:") a').text().trim();

    // Extract episodes data from script
    const scripts = $('script').toArray().map(el => $(el).html() || '').join('\n');
    
    // Look for episodesData variable
    const episodesMatch = scripts.match(/var\s+episodesData\s*=\s*\{([\s\S]*?)\n\s*\};/);
    
    const episodes = { vf: {}, vostfr: {} };
    
    if (episodesMatch) {
        // Parse VF episodes
        const vfMatch = episodesMatch[1].match(/vf:\s*\{([\s\S]*?)\},\s*vostfr/);
        if (vfMatch) {
            const vfContent = vfMatch[1];
            const epRegex = /(\d+):\s*\{vidzy:"([^"]*)"/g;
            let epMatch;
            while ((epMatch = epRegex.exec(vfContent))) {
                const epNum = parseInt(epMatch[1]);
                const vidzyUrl = epMatch[2];
                if (epNum > 0 && vidzyUrl) {
                    episodes.vf[epNum] = vidzyUrl.replace('/embed-', '/d/');
                }
            }
        }
        
        // Parse VOSTFR episodes
        const vostfrMatch = episodesMatch[1].match(/vostfr:\s*\{([\s\S]*?)\}\s*$/);
        if (vostfrMatch) {
            const vostfrContent = vostfrMatch[1];
            const epRegex = /(\d+):\s*\{vidzy:"([^"]*)"/g;
            let epMatch;
            while ((epMatch = epRegex.exec(vostfrContent))) {
                const epNum = parseInt(epMatch[1]);
                const vidzyUrl = epMatch[2];
                if (epNum > 0 && vidzyUrl) {
                    episodes.vostfr[epNum] = vidzyUrl.replace('/embed-', '/d/');
                }
            }
        }
    }

    // Count available episodes
    const vfEpisodes = Object.keys(episodes.vf).map(Number).sort((a, b) => a - b);
    const vostfrEpisodes = Object.keys(episodes.vostfr).map(Number).sort((a, b) => a - b);

    return {
        url,
        title,
        genres,
        actors,
        version,
        quality,
        isSeries: true,
        episodes,
        vfEpisodes,
        vostfrEpisodes,
        totalVf: vfEpisodes.length,
        totalVostfr: vostfrEpisodes.length
    };
}

/**
 * Get movie details from a movie page URL
 * @param {string} url - Movie page URL
 * @returns {Promise<Object>} Movie details object
 */
async function getMovieDetail(url) {
    const html = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
    });
    const $ = cheerio.load(html.data);

    const title = $('#s-list li').first().text().replace('Titre Original:', '').trim();
    const genres = $('#s-list li:contains("Genre:") a').map((i, el) => $(el).text().trim()).get();
    const director = $('#s-list li:contains("Réalisateur:") a').text().trim();
    const actors = $('#s-list li:contains("Acteurs:") a').map((i, el) => $(el).text().trim()).get();
    const version = $('li:contains("Version:") a').text().trim();
    const quality = $('li:contains("Qualité:") a').text().trim();
    const releaseYear = $('li:contains("Date de sortie:") a').text().trim();
    const budget = $('li:contains("budget du Film")').text()?.split(':')[1]?.trim() || 'Unknown';
    const language = $('li:contains("Langue d\'origine") a').text().trim();

    const script = $('script').toArray().map(el => $(el).html()).join('\n');
    
    // Check if this is a series (has episodesData)
    if (script.includes('episodesData')) {
        return await getSeriesDetail(url);
    }
    
    const regex = /case\s+'([^']+)':\s*url\s*=\s*'([^']+)'/g;
    const player = {};
    let match;

    while ((match = regex.exec(script))) {
        player[match[1]] = match[2]?.replace('/embed-', '/d/');
    }
    return {
        url,
        title,
        genres,
        director,
        actors,
        version,
        quality,
        releaseYear,
        budget,
        language,
        player,
        isSeries: false
    };
}

/**
 * Get download information from a video URL
 * @param {string} url - Video page URL
 * @returns {Promise<Object>} Download information
 */
async function getDownloadInfo(url) {
    const html = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
    });
    const $$ = cheerio.load(html.data);
    const data = qs.stringify({
        op: $$('input[name="op"]').attr('value'),
        id: $$('input[name="id"]').attr('value'),
        hash: Date.now().toString(26)
    });

    const res = await axios.post(url, data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
    });
    const $ = cheerio.load(res.data);
    return {
        filename: $('.other-title-bold').text().trim(),
        size: $('.file_slot td').eq(1).text(),
        download: $('.main-button').attr('href')
    };
}

/**
 * Get the best quality link (prioritize haute > moyenne > basse)
 * @param {Object} player - Player object with quality links
 * @returns {Object} Best quality info {name, url}
 */
function getBestQuality(player) {
    const priorities = ['haute', 'moyenne', 'basse'];
    for (const quality of priorities) {
        if (player[quality]) {
            return { name: quality, url: player[quality] };
        }
    }
    // Fallback to first available
    const firstKey = Object.keys(player)[0];
    return firstKey ? { name: firstKey, url: player[firstKey] } : null;
}

/**
 * Parse file size string to bytes
 * @param {string} sizeStr - Size string like "803.5 MB"
 * @returns {number} Size in bytes
 */
function parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024, TB: 1024 * 1024 * 1024 * 1024 };
    return value * (multipliers[unit] || 1);
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean up expired sessions
 */
function cleanupSessions() {
    const now = Date.now();
    for (const [key, session] of movieSessions.entries()) {
        if (now - session.timestamp > SESSION_TIMEOUT) {
            movieSessions.delete(key);
        }
    }
}

// Clean up sessions periodically
setInterval(cleanupSessions, 60000);

// ==================== MOVIE SEARCH COMMAND ====================
Sparky({
    name: "movie|film|movies",
    fromMe: isPublic,
    desc: "Search for movies - interactive selection",
    category: "downloader",
}, async ({ m, client, args }) => {
    try {
        const query = args || m.quoted?.text;
        
        if (!query) {
            return await m.reply('🎬 *Recherche de Film*\n\nEntrez le nom du film à rechercher.\nExemple: .movie Avengers');
        }

        await m.react('🔎');

        const results = await searchMovies(query);

        if (!results || results.length === 0) {
            await m.react('❌');
            return await m.reply('❌ Aucun film trouvé pour votre recherche.');
        }

        // Store session for this user
        const sessionKey = m.sender;
        const limitedResults = results.slice(0, 10);

        // Format search results
        let message = `🎬 *Résultats pour "${query}"*\n\n`;
        
        limitedResults.forEach((movie, index) => {
            message += `*${index + 1}.* ${movie.title}\n`;
        });

        message += `\n_Répondez avec un numéro (1-${limitedResults.length}) pour voir les détails du film._`;

        // Send message and capture the message ID for reply validation
        const sentMsg = await m.reply(message);
        const botMsgId = sentMsg?.key?.id;
        
        movieSessions.set(sessionKey, {
            type: 'search',
            results: limitedResults,
            query: query,
            timestamp: Date.now(),
            botMsgId: botMsgId
        });

        await m.react('✅');

    } catch (error) {
        console.error('Movie Search Error:', error);
        await m.react('❌');
        await m.reply(`❌ Erreur: ${error.message || 'Échec de la recherche. Veuillez réessayer.'}`);
    }
});

// ==================== MOVIE SELECTION HANDLER ====================
Sparky({
    on: true,
    fromMe: isPublic,
    desc: "Handle movie selection responses",
}, async ({ m, client, args }) => {
    try {
        // Quick exit if no session exists for this user (performance optimization)
        const sessionKey = m.sender;
        if (!movieSessions.has(sessionKey)) return;
        
        // Check if this is a reply to a movie search
        if (!m.quoted) return;
        
        const session = movieSessions.get(sessionKey);
        if (!session) return;
        
        // Validate that the reply is specifically to the bot's movie-related message
        // This prevents spam from processing unrelated reply messages with numbers
        const quotedMsgId = m.quoted?.stanzaId || m.quoted?.key?.id;
        if (session.botMsgId && quotedMsgId !== session.botMsgId) return;
        
        const input = m.body?.trim();
        if (!input) return;
        
        // Quick check: only process if input is a number
        const num = parseInt(input);
        if (isNaN(num)) return;

        // Handle search result selection (user picks a number 1-10)
        if (session.type === 'search') {
            if (num < 1 || num > session.results.length) return;

            const selectedMovie = session.results[num - 1];
            if (!selectedMovie || !selectedMovie.url) return;

            await m.react('⏳');

            // Get movie/series details
            const details = await getMovieDetail(selectedMovie.url);

            if (!details || !details.title) {
                await m.react('❌');
                return await m.reply('❌ Impossible de récupérer les détails.');
            }

            // Format details with thumbnail
            let caption = `🎬 *${details.title}*\n\n`;
            
            if (details.genres && details.genres.length > 0) {
                caption += `📽️ *Genres:* ${details.genres.join(', ')}\n`;
            }
            if (details.director) {
                caption += `🎬 *Réalisateur:* ${details.director}\n`;
            }
            if (details.actors && details.actors.length > 0) {
                caption += `🎭 *Acteurs:* ${details.actors.slice(0, 5).join(', ')}${details.actors.length > 5 ? '...' : ''}\n`;
            }
            if (details.releaseYear) {
                caption += `📅 *Année:* ${details.releaseYear}\n`;
            }
            if (details.quality) {
                caption += `📺 *Qualité:* ${details.quality}\n`;
            }
            if (details.version) {
                caption += `🌐 *Version:* ${details.version}\n`;
            }

            // Check if it's a series
            if (details.isSeries) {
                caption += `\n📺 *C'est une série TV!*\n`;
                caption += `📊 Épisodes VF: ${details.totalVf}\n`;
                caption += `📊 Épisodes VOSTFR: ${details.totalVostfr}\n`;
                caption += `\n_Choisissez la version:_\n`;
                caption += `*1.* VF (Français)\n`;
                caption += `*2.* VOSTFR (Sous-titré)\n`;
                caption += `\n_Répondez 1 ou 2 pour choisir._`;

                // Send with thumbnail if available and capture message ID
                let sentMsg;
                if (selectedMovie.thumbnail) {
                    sentMsg = await client.sendMessage(m.jid, {
                        image: { url: selectedMovie.thumbnail },
                        caption: caption
                    }, { quoted: m });
                } else {
                    sentMsg = await m.reply(caption);
                }
                const botMsgId = sentMsg?.key?.id;

                // Update session for series episode selection
                movieSessions.set(sessionKey, {
                    type: 'series_version',
                    series: details,
                    thumbnail: selectedMovie.thumbnail,
                    timestamp: Date.now(),
                    botMsgId: botMsgId
                });
            } else {
                // It's a movie - show quality options
                if (details.player && Object.keys(details.player).length > 0) {
                    const qualities = Object.keys(details.player);
                    caption += `\n📥 *Qualités disponibles:*\n`;
                    qualities.forEach((q, i) => {
                        caption += `*${i + 1}.* ${q}\n`;
                    });
                    caption += `\n_Répondez avec un numéro (1-${qualities.length}) pour télécharger._`;

                    // Send with thumbnail if available and capture message ID
                    let sentMsg;
                    if (selectedMovie.thumbnail) {
                        sentMsg = await client.sendMessage(m.jid, {
                            image: { url: selectedMovie.thumbnail },
                            caption: caption
                        }, { quoted: m });
                    } else {
                        sentMsg = await m.reply(caption);
                    }
                    const botMsgId = sentMsg?.key?.id;

                    movieSessions.set(sessionKey, {
                        type: 'details',
                        movie: details,
                        thumbnail: selectedMovie.thumbnail,
                        timestamp: Date.now(),
                        botMsgId: botMsgId
                    });
                } else {
                    caption += `\n❌ Aucun lien de téléchargement disponible.`;
                    // Send with thumbnail if available
                    if (selectedMovie.thumbnail) {
                        await client.sendMessage(m.jid, {
                            image: { url: selectedMovie.thumbnail },
                            caption: caption
                        }, { quoted: m });
                    } else {
                        await m.reply(caption);
                    }
                    movieSessions.delete(sessionKey);
                }
            }
            
            await m.react('✅');
            return;
        }

        // Handle series version selection (VF or VOSTFR)
        if (session.type === 'series_version') {
            if (num !== 1 && num !== 2) return;

            const version = num === 1 ? 'vf' : 'vostfr';
            const versionName = num === 1 ? 'VF' : 'VOSTFR';
            const episodes = session.series.episodes[version];
            const episodeNumbers = Object.keys(episodes).map(Number).sort((a, b) => a - b);

            if (episodeNumbers.length === 0) {
                await m.react('❌');
                movieSessions.delete(sessionKey);
                return await m.reply(`❌ Aucun épisode disponible en ${versionName}.`);
            }

            let message = `📺 *${session.series.title}* - ${versionName}\n\n`;
            message += `📊 *${episodeNumbers.length} épisodes disponibles*\n\n`;
            
            // Show episodes in groups if many
            if (episodeNumbers.length <= 20) {
                episodeNumbers.forEach(ep => {
                    message += `*${ep}.* Épisode ${ep}\n`;
                });
            } else {
                message += `Épisodes: ${episodeNumbers[0]} - ${episodeNumbers[episodeNumbers.length - 1]}\n`;
            }
            
            message += `\n_Répondez avec le numéro de l'épisode à télécharger._`;

            // Send message and capture ID
            const sentMsg = await m.reply(message);
            const botMsgId = sentMsg?.key?.id;

            // Update session for episode selection
            movieSessions.set(sessionKey, {
                type: 'series_episode',
                series: session.series,
                version: version,
                versionName: versionName,
                episodes: episodes,
                episodeNumbers: episodeNumbers,
                thumbnail: session.thumbnail,
                timestamp: Date.now(),
                botMsgId: botMsgId
            });

            await m.react('✅');
            return;
        }

        // Handle series episode selection
        if (session.type === 'series_episode') {
            if (!session.episodeNumbers.includes(num)) {
                return await m.reply(`❌ Épisode ${num} non disponible. Épisodes disponibles: ${session.episodeNumbers.join(', ')}`);
            }

            const downloadUrl = session.episodes[num];
            if (!downloadUrl) {
                await m.react('❌');
                return await m.reply('❌ Lien de téléchargement non disponible pour cet épisode.');
            }

            await m.react('⏳');

            // Get download info
            const downloadInfo = await getDownloadInfo(downloadUrl);

            if (!downloadInfo || !downloadInfo.download) {
                await m.react('❌');
                movieSessions.delete(sessionKey);
                return await m.reply('❌ Impossible de récupérer le lien de téléchargement.');
            }

            const fileSizeBytes = parseSizeToBytes(downloadInfo.size);
            const MAX_SIZE_MB = 50;

            // Clear session
            movieSessions.delete(sessionKey);

            // Send progress message
            await m.reply(`📥 *Téléchargement en cours...*\n\n📺 *${session.series.title}*\n🎬 *Épisode ${num}* (${session.versionName})\n📁 *Fichier:* ${downloadInfo.filename}\n📏 *Taille:* ${downloadInfo.size}\n\n⏳ Veuillez patienter...`);

            try {
                // Download the file
                const response = await axios({
                    method: 'GET',
                    url: downloadInfo.download,
                    responseType: 'arraybuffer',
                    timeout: DOWNLOAD_TIMEOUT
                });

                const buffer = Buffer.from(response.data);
                const actualSizeMB = buffer.length / (1024 * 1024);

                // Send as document if > 50MB, otherwise as video
                const caption = `📺 *${session.series.title}*\n🎬 *Épisode ${num}* (${session.versionName})\n📏 *Taille:* ${formatBytes(buffer.length)}`;
                
                if (actualSizeMB > MAX_SIZE_MB) {
                    await client.sendMessage(m.jid, {
                        document: buffer,
                        mimetype: 'video/mp4',
                        fileName: downloadInfo.filename || `${session.series.title}_E${num}.mp4`,
                        caption: caption
                    }, { quoted: m });
                } else {
                    await client.sendMessage(m.jid, {
                        video: buffer,
                        caption: caption
                    }, { quoted: m });
                }

                await m.react('✅');

            } catch (downloadError) {
                console.error('Download Error:', downloadError);
                await m.reply(`❌ Échec du téléchargement direct.\n\n🔗 *Lien:*\n${downloadInfo.download}`);
                await m.react('⚠️');
            }
            return;
        }

        // Handle quality selection (user picks quality 1, 2, 3)
        if (session.type === 'details') {
            const qualities = Object.keys(session.movie.player);
            
            if (num < 1 || num > qualities.length) return;

            const selectedQuality = qualities[num - 1];
            const downloadUrl = session.movie.player[selectedQuality];

            if (!downloadUrl) return;

            await m.react('⏳');

            // Get download info
            const downloadInfo = await getDownloadInfo(downloadUrl);

            if (!downloadInfo || !downloadInfo.download) {
                await m.react('❌');
                movieSessions.delete(sessionKey);
                return await m.reply('❌ Impossible de récupérer le lien de téléchargement. Le lien a peut-être expiré.');
            }

            const fileSizeBytes = parseSizeToBytes(downloadInfo.size);
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            const MAX_SIZE_MB = 50;

            // Clear session
            movieSessions.delete(sessionKey);

            // Send initial progress message
            await m.reply(`📥 *Téléchargement en cours...*\n\n📁 *Fichier:* ${downloadInfo.filename}\n📏 *Taille:* ${downloadInfo.size}\n📊 *Qualité:* ${selectedQuality}\n\n⏳ Préparation du téléchargement...`);

            try {
                // Download the file
                const response = await axios({
                    method: 'GET',
                    url: downloadInfo.download,
                    responseType: 'arraybuffer',
                    timeout: DOWNLOAD_TIMEOUT
                });

                const buffer = Buffer.from(response.data);
                const actualSizeMB = buffer.length / (1024 * 1024);

                // Update progress
                await m.reply(`📥 *Téléchargement terminé!*\n📏 *Taille:* ${formatBytes(buffer.length)}\n\n⏳ Envoi en cours...`);

                // Send as document if > 50MB, otherwise as video
                if (actualSizeMB > MAX_SIZE_MB) {
                    await client.sendMessage(m.jid, {
                        document: buffer,
                        mimetype: 'video/mp4',
                        fileName: downloadInfo.filename || `${session.movie.title}.mp4`,
                        caption: `🎬 *${session.movie.title}*\n📊 *Qualité:* ${selectedQuality}\n📏 *Taille:* ${formatBytes(buffer.length)}`
                    }, { quoted: m });
                } else {
                    await client.sendMessage(m.jid, {
                        video: buffer,
                        caption: `🎬 *${session.movie.title}*\n📊 *Qualité:* ${selectedQuality}\n📏 *Taille:* ${formatBytes(buffer.length)}`
                    }, { quoted: m });
                }

                await m.react('✅');

            } catch (downloadError) {
                console.error('Download Error:', downloadError);
                
                // If download fails, send the link instead
                await m.reply(`❌ Échec du téléchargement direct.\n\n🔗 *Lien de téléchargement:*\n${downloadInfo.download}\n\n📁 *Fichier:* ${downloadInfo.filename}\n📏 *Taille:* ${downloadInfo.size}`);
                await m.react('⚠️');
            }
            return;
        }

    } catch (error) {
        console.error('Movie Selection Error:', error);
        // Don't reply on errors for the on:true handler to avoid spam
    }
});

// ==================== MOVIE INFO COMMAND (Direct URL) ====================
Sparky({
    name: "movieinfo|filminfo",
    fromMe: isPublic,
    desc: "Get detailed information about a movie",
    category: "downloader",
}, async ({ m, client, args }) => {
    try {
        const url = args || m.quoted?.text;
        
        if (!url) {
            return await m.reply('🎬 *Movie Info*\n\nEntrez une URL de film.\nExemple: .movieinfo https://fs-miroir13.lol/films/...');
        }

        // Validate URL
        if (!url.includes('fs-miroir13.lol')) {
            return await m.reply('❌ *URL invalide*\nVeuillez fournir une URL valide des résultats de recherche.');
        }

        await m.react('⏳');

        const details = await getMovieDetail(url);

        if (!details || !details.title) {
            await m.react('❌');
            return await m.reply('❌ Impossible de récupérer les détails du film.');
        }

        // Format movie details
        let message = `🎬 *${details.title}*\n\n`;
        
        if (details.genres && details.genres.length > 0) {
            message += `📽️ *Genres:* ${details.genres.join(', ')}\n`;
        }
        if (details.director) {
            message += `🎬 *Réalisateur:* ${details.director}\n`;
        }
        if (details.actors && details.actors.length > 0) {
            message += `🎭 *Acteurs:* ${details.actors.slice(0, 5).join(', ')}${details.actors.length > 5 ? '...' : ''}\n`;
        }
        if (details.releaseYear) {
            message += `📅 *Année:* ${details.releaseYear}\n`;
        }
        if (details.quality) {
            message += `📺 *Qualité:* ${details.quality}\n`;
        }
        if (details.version) {
            message += `🌐 *Version:* ${details.version}\n`;
        }
        if (details.language) {
            message += `🗣️ *Langue:* ${details.language}\n`;
        }
        if (details.budget && details.budget !== 'Unknown') {
            message += `💰 *Budget:* ${details.budget}\n`;
        }

        // Add download links if available
        if (details.player && Object.keys(details.player).length > 0) {
            message += `\n📥 *Liens de téléchargement:*\n`;
            Object.entries(details.player).forEach(([name, link]) => {
                message += `• ${name}: ${link}\n`;
            });
            message += `\n_Utilisez .moviedl <url> pour télécharger._`;
        }

        await m.reply(message);
        await m.react('✅');

    } catch (error) {
        console.error('Movie Info Error:', error);
        await m.react('❌');
        await m.reply(`❌ Erreur: ${error.message || 'Échec de la récupération des détails.'}`);
    }
});

// ==================== MOVIE DOWNLOAD COMMAND (Direct URL) ====================
Sparky({
    name: "moviedl|filmdl|moviedownload",
    fromMe: isPublic,
    desc: "Download a movie directly",
    category: "downloader",
}, async ({ m, client, args }) => {
    try {
        const url = args || m.quoted?.text;
        
        if (!url) {
            return await m.reply('📥 *Movie Download*\n\nEntrez une URL de téléchargement.\nExemple: .moviedl https://vidzy.org/d/...');
        }

        await m.react('⏳');

        // Get download info
        const downloadInfo = await getDownloadInfo(url);

        if (!downloadInfo || !downloadInfo.download) {
            await m.react('❌');
            return await m.reply('❌ Impossible de récupérer le lien. Le lien a peut-être expiré.');
        }

        const fileSizeBytes = parseSizeToBytes(downloadInfo.size);
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        const MAX_SIZE_MB = 50;

        // Send progress message
        await m.reply(`📥 *Téléchargement en cours...*\n\n📁 *Fichier:* ${downloadInfo.filename}\n📏 *Taille:* ${downloadInfo.size}\n\n⏳ Veuillez patienter...`);

        try {
            // Download the file
            const response = await axios({
                method: 'GET',
                url: downloadInfo.download,
                responseType: 'arraybuffer',
                timeout: DOWNLOAD_TIMEOUT
            });

            const buffer = Buffer.from(response.data);
            const actualSizeMB = buffer.length / (1024 * 1024);

            // Send as document if > 50MB, otherwise as video
            if (actualSizeMB > MAX_SIZE_MB) {
                await client.sendMessage(m.jid, {
                    document: buffer,
                    mimetype: 'video/mp4',
                    fileName: downloadInfo.filename || 'movie.mp4',
                    caption: `🎬 *Film téléchargé*\n📏 *Taille:* ${formatBytes(buffer.length)}`
                }, { quoted: m });
            } else {
                await client.sendMessage(m.jid, {
                    video: buffer,
                    caption: `🎬 *Film téléchargé*\n📏 *Taille:* ${formatBytes(buffer.length)}`
                }, { quoted: m });
            }

            await m.react('✅');

        } catch (downloadError) {
            console.error('Download Error:', downloadError);
            
            // If download fails, send the link instead
            await m.reply(`❌ Échec du téléchargement direct.\n\n🔗 *Lien de téléchargement:*\n${downloadInfo.download}\n\n📁 *Fichier:* ${downloadInfo.filename}\n📏 *Taille:* ${downloadInfo.size}`);
            await m.react('⚠️');
        }

    } catch (error) {
        console.error('Movie Download Error:', error);
        await m.react('❌');
        await m.reply(`❌ Erreur: ${error.message || 'Échec du téléchargement.'}`);
    }
});
