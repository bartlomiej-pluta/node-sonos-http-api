'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fileDuration = require('../helpers/file-duration');
const settings = require('../../settings');
const { execFile } = require('child_process')

function espeak(phrase, language) {
  if (!settings.espeak) {
    return Promise.resolve();

  }

  // Construct a filesystem neutral filename
  const phraseHash = crypto.createHash('sha1').update(phrase).digest('hex');
  const filename = `espeak-${phraseHash}-${language}.wav`;
  const filepath = path.resolve(settings.webroot, 'tts', filename);

  if (!language) {
    language = 'en-gb';
  }  
  

  // Settings
  const gap = settings.espeak.gap || 0;
  const capitals = settings.espeak.capitals || 1;
  const pitch = settings.espeak.pitch || 50;
  const speed = settings.espeak.speed || 175;  


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
    console.log(`announce file for phrase "${phrase}" does not seem to exist, spawning eSpeak`);
  }


  return new Promise((resolve, reject) => {  
    execFile("espeak", ["-v", language, "-g", gap, "-k", capitals, "-p", pitch, "-s", speed, "-w", filepath, phrase], err => {
      if(err) {
        reject(err);        
      }
        
      resolve(expectedUri);
    });        
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


module.exports = espeak;
