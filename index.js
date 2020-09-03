const musixmatch = require('./mxm');
const spotify = require('./spotify');
const config = require('./config.json');
const axios = require('axios').default;
let currentUri = null;
let activeLoop = false;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function checkForNewSong() {
  if (activeLoop) return;
  activeLoop = true;
  let songData = false;
  while (!songData) {
    const sData = await spotify.checkForStateChange();
    if (sData && (sData.item.uri != currentUri)) {
      songData = sData;
    }
    await sleep(config.song_refresh);
  }
  activeLoop = false;
  beginSyncing(songData);
}

async function beginSyncing(songData) {
  let artists = [];
	for (let artistIndex in songData.artists) {
		let artist = songData.artists[artistIndex];
		artists.push(artist.name);
  }
  currentUri = songData.item.uri;
  const lyrics = await musixmatch.searchForLyrics(songData.item.name, songData.item.artists[0].name, artists.join(','), songData.item.album.name, songData.item.duration_ms, songData.item.uri);
  beginLyricLoop(lyrics);
}

function setStatus(status) {
  try {
    axios({method: 'PATCH', url: 'https://discordapp.com/api/v6/users/@me/settings', data: {
      custom_status: {
        text: status,
      }
    }, headers: {Authorization: config.DiscordToken, 'Content-Type': 'application/json'}});
  } catch (e) {
    //
  }
}


async function beginLyricLoop(lyrics) {
  const songInfo = await spotify.getSongInfo();
  console.log(`Song Playing: ${songInfo.item.name}`);
  if (!lyrics) {
    console.log('Lyrics not found.');
    checkForNewSong();
    return;
  }

  let startTime = new Date(Date.now() - songInfo.progress_ms);
  let curLyrTime = 0.0;
  let songInterval;
  let stateChangeInterval;

  songInterval = setInterval(() => {
    let newTime = ((Date.now() - startTime) / 1000).toFixed(2);
    //console.log(`${newTime}: ${lyrics[newTime] ? lyrics[newTime] : "NO LYRICS"}`);
    if (lyrics[newTime] && newTime != curLyrTime) {
      console.log(`${newTime}: ${lyrics[newTime]}`);
      setStatus(lyrics[newTime]);
      curLyrTime = newTime;
    }

    if (songInfo.item.duration_ms / 1000 < newTime) {
      clearInterval(songInterval);
      clearInterval(stateChangeInterval);
      console.log('\nSong ended\n');
      setStatus(null);
      currentUri = null;
      checkForNewSong();
    }
  }, 1);

  stateChangeInterval = setInterval(async () => {
    const stateInfo = await spotify.checkForStateChange();
    if (stateInfo) { //? ensures the player is playing
      if (stateInfo.item.uri != currentUri) {
        clearInterval(songInterval);
        clearInterval(stateChangeInterval);
        console.log('\nSong changed\n');
        setStatus(null);
        checkForNewSong();
      } else if ((curLyrTime > stateInfo.progress_ms / 1000) && curLyrTime != 0.0) {
        console.log('\nSong position mismatch, recalculating start time.\n');
        startTime = new Date(Date.now() - stateInfo.progress_ms);
        curLyrTime = 0.0;
      }
    } else {
      clearInterval(songInterval);
      clearInterval(stateChangeInterval);
      console.log('\nPlayer stopped\n');
      setStatus('Song paused.');
      setTimeout(() => setStatus(null), 5000);
      currentUri = null;
      checkForNewSong();
    }
  }, config.song_refresh);

}

checkForNewSong();

process.on('SIGINT', function() {
  console.log('Cleaning up status');
  setStatus(null);
  process.exit();
});