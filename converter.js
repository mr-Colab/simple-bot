const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

// Use ffmpeg-static for the ffmpeg binary
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (error) {
  console.warn('ffmpeg-static not found, using system ffmpeg');
  ffmpegPath = 'ffmpeg'; // Fallback to system ffmpeg
}

// Temp directory for audio/video conversion
const TEMP_DIR = path.join(__dirname, 'data', 'assets', 'audio');

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    try {
      // Create temp directory if it doesn't exist
      try {
        if (!fs.existsSync(TEMP_DIR)) {
          fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
      } catch (dirError) {
        console.error('Failed to create temp directory:', dirError);
        return reject(new Error('Failed to create temp directory: ' + dirError.message));
      }
      
      let tmp = path.join(TEMP_DIR, new Date().getTime() + '.' + ext)
      let out = tmp + '.' + ext2
      await fs.promises.writeFile(tmp, buffer)
      
      spawn(ffmpegPath, [
        '-y',
        '-i', tmp,
        ...args,
        out
      ])
        .on('error', reject)
        .on('close', async (code) => {
          try {
            await fs.promises.unlink(tmp)
            if (code !== 0) return reject(code)
            resolve(await fs.promises.readFile(out))
            await fs.promises.unlink(out)
          } catch (e) {
            reject(e)
          }
        })
    } catch (e) {
      reject(e)
    }
  })
}

function toAudio(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-ac', '2',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'mp3'
  ], ext, 'mp3')
}

function toPTT(buffer, ext) {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10'
  ], ext, 'opus')
}

function toVideo(buffer, ext) {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ab', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow'
  ], ext, 'mp4')
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg,
}