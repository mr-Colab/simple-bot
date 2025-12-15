const { Sparky, isPublic } = require("../lib");
const { getString } = require("./pluginsCore");
const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');
const lang = getString('download');

// Movie API base URL
const MOVIE_API_BASE = 'https://fs-miroir13.lol';

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
    const regex = /case\s+'([^']+)':\s*url\s*=\s*'([^']+)'/g;
    const player = {};
    let match;

    while ((match = regex.exec(script))) {
        player[match[1]] = match[2]?.replace('/embed-', '/d/');
    }
    return {
        title,
        genres,
        director,
        actors,
        version,
        quality,
        releaseYear,
        budget,
        language,
        player
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

// ==================== MOVIE SEARCH COMMAND ====================
Sparky({
    name: "movie|film|movies",
    fromMe: isPublic,
    desc: "Search for movies",
    category: "downloader",
}, async ({ m, client, args }) => {
    try {
        const query = args || m.quoted?.text;
        
        if (!query) {
            return await m.reply('🎬 *Movie Search*\n\nPlease provide a movie name to search.\nExample: .movie Avengers');
        }

        await m.react('🔎');

        const results = await searchMovies(query);

        if (!results || results.length === 0) {
            await m.react('❌');
            return await m.reply('❌ No movies found for your search query.');
        }

        // Format search results
        let message = `🎬 *Movie Search Results for "${query}"*\n\n`;
        
        results.slice(0, 10).forEach((movie, index) => {
            message += `*${index + 1}.* ${movie.title}\n`;
            if (movie.url) {
                message += `   🔗 ${movie.url}\n`;
            }
            message += '\n';
        });

        message += `\n_Use .movieinfo <url> to get more details about a movie._`;

        await m.reply(message);
        await m.react('✅');

    } catch (error) {
        console.error('Movie Search Error:', error);
        await m.react('❌');
        await m.reply(`❌ Error: ${error.message || 'Failed to search for movies. Please try again.'}`);
    }
});

// ==================== MOVIE INFO COMMAND ====================
Sparky({
    name: "movieinfo|filminfo",
    fromMe: isPublic,
    desc: "Get detailed information about a movie",
    category: "downloader",
}, async ({ m, client, args }) => {
    try {
        const url = args || m.quoted?.text;
        
        if (!url) {
            return await m.reply('🎬 *Movie Info*\n\nPlease provide a movie URL.\nExample: .movieinfo https://fs-miroir13.lol/films/...');
        }

        // Validate URL
        if (!url.includes('fs-miroir13.lol')) {
            return await m.reply('❌ *Invalid URL*\nPlease provide a valid movie URL from the search results.');
        }

        await m.react('⏳');

        const details = await getMovieDetail(url);

        if (!details || !details.title) {
            await m.react('❌');
            return await m.reply('❌ Could not retrieve movie details.');
        }

        // Format movie details
        let message = `🎬 *${details.title}*\n\n`;
        
        if (details.genres && details.genres.length > 0) {
            message += `📽️ *Genres:* ${details.genres.join(', ')}\n`;
        }
        if (details.director) {
            message += `🎬 *Director:* ${details.director}\n`;
        }
        if (details.actors && details.actors.length > 0) {
            message += `🎭 *Actors:* ${details.actors.slice(0, 5).join(', ')}${details.actors.length > 5 ? '...' : ''}\n`;
        }
        if (details.releaseYear) {
            message += `📅 *Release Year:* ${details.releaseYear}\n`;
        }
        if (details.quality) {
            message += `📺 *Quality:* ${details.quality}\n`;
        }
        if (details.version) {
            message += `🌐 *Version:* ${details.version}\n`;
        }
        if (details.language) {
            message += `🗣️ *Language:* ${details.language}\n`;
        }
        if (details.budget && details.budget !== 'Unknown') {
            message += `💰 *Budget:* ${details.budget}\n`;
        }

        // Add download links if available
        if (details.player && Object.keys(details.player).length > 0) {
            message += `\n📥 *Download Links:*\n`;
            Object.entries(details.player).forEach(([name, link]) => {
                message += `• ${name}: ${link}\n`;
            });
            message += `\n_Use .moviedl <download_url> to get the direct download link._`;
        }

        await m.reply(message);
        await m.react('✅');

    } catch (error) {
        console.error('Movie Info Error:', error);
        await m.react('❌');
        await m.reply(`❌ Error: ${error.message || 'Failed to get movie details. Please try again.'}`);
    }
});

// ==================== MOVIE DOWNLOAD COMMAND ====================
Sparky({
    name: "moviedl|filmdl|moviedownload",
    fromMe: isPublic,
    desc: "Get direct download link for a movie",
    category: "downloader",
}, async ({ m, client, args }) => {
    try {
        const url = args || m.quoted?.text;
        
        if (!url) {
            return await m.reply('📥 *Movie Download*\n\nPlease provide a download URL.\nExample: .moviedl https://vidzy.org/d/...');
        }

        await m.react('⏳');

        const downloadInfo = await getDownloadInfo(url);

        if (!downloadInfo || !downloadInfo.download) {
            await m.react('❌');
            return await m.reply('❌ Could not retrieve download link. The link may have expired or is invalid.');
        }

        // Format download info
        let message = `📥 *Download Ready*\n\n`;
        
        if (downloadInfo.filename) {
            message += `📁 *Filename:* ${downloadInfo.filename}\n`;
        }
        if (downloadInfo.size) {
            message += `📏 *Size:* ${downloadInfo.size}\n`;
        }
        message += `\n🔗 *Download Link:*\n${downloadInfo.download}`;

        await m.reply(message);
        await m.react('✅');

    } catch (error) {
        console.error('Movie Download Error:', error);
        await m.react('❌');
        await m.reply(`❌ Error: ${error.message || 'Failed to get download link. Please try again.'}`);
    }
});
