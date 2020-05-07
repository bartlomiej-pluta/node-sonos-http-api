'use strict';
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const fileDuration = require('../helpers/file-duration');
const settings = require('../../settings');
const logger = require('sonos-discovery/lib/helpers/logger');

function android(phrase, language) {
  if (!settings.android) {
    return Promise.resolve();
  }  

  if (!language) {
    language = 'en_US';
  }    

  // Construct a filesystem neutral filename
  const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  const filename = `android-${phraseHash}-${language}.wav`;
  const filepath = path.resolve(settings.webroot, 'tts', filename);

  const expectedUri = `/tts/${filename}`;
  try {
    fs.accessSync(filepath, fs.R_OK);
    return fileDuration(filepath)
      .then((duration) => {
        return {
          duration,
          uri: expectedUri
        };
      });
  } catch (err) {
    logger.info(`announce file for phrase "${phrase}" does not seem to exist, downloading`);
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ text: phrase, language });        
    const file = fs.createWriteStream(filepath);
    const options = {
      hostname: settings.android.host,
      port: settings.android.port,      
      path: '/wave',
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    }

    const request = http.request(options, response => {
      if(response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`Download from Android TTS failed with status ${response.statusCode}, ${response.message}`));
      }

      response.pipe(file);
      file.on('finish', function () {
        file.end();
        resolve(expectedUri);
      });
    });
    request.on('error', err => reject(err));
    request.write(data);
    request.end();
  })
    .then(() => {
      return fileDuration(filepath);
    })
    .then((duration) => {
      return {
        duration,
        uri: expectedUri
      };
    });
}

module.exports = android;
