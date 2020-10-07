const axios = require('axios').default;
const config = require('./config.json');
const fs = require('fs');

let spotifyToken = getSpotifyToken();
const spotifyBase64 = new Buffer.from(`${config.SpotifyApi.client_id}:${config.SpotifyApi.client_secret}`).toString('base64');

function getSpotifyToken() {
	let tokenData = JSON.parse(fs.readFileSync(__dirname + '/token.json'));
	return tokenData.AccessToken;
}

function getSpotifyRefreshToken() {
	let tokenData = JSON.parse(fs.readFileSync(__dirname + '/token.json'));
	return tokenData.RefreshToken;
}

async function refreshToken() { 
  let RT = getSpotifyRefreshToken();
  try {
    let tokens = await axios({
      url: 'https://accounts.spotify.com/api/token',
      method: 'POST',
      params: {
        grant_type: 'refresh_token',
        refresh_token: RT
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + spotifyBase64
      }
    });
  
    let tokenData = tokens.data;
    let accessToken = tokenData.access_token;
  
    fs.writeFileSync(__dirname + '/token.json', JSON.stringify({
      AccessToken: accessToken,
      RefreshToken: RT
    }));
  } catch (e) {
    console.log(`refreshToken ERR: ${e}`);
  }
}

async function checkForStateChange() {
  try {
    let curPlaying = await axios({
      url: 'https://api.spotify.com/v1/me/player/currently-playing?market=GB',
      headers: {
        Authorization: 'Bearer ' + spotifyToken
      }
    });
    
    if (curPlaying.status === 204 || !curPlaying.data.is_playing) {
      return new Promise(resolve => resolve(false));
    } else {
      return new Promise(resolve => resolve(curPlaying.data));
    }
  } catch (e) {
    if (e.response?.status === 401) {
      await refreshToken();
      spotifyToken = getSpotifyToken();
      console.log('token refreshed.');
    } else {
      console.log(`stateChange ERR: ${e}`);
    }
    return new Promise(resolve => resolve(false));
  }
}

async function getSongInfo() {
  try {
    let curPlaying = await axios({
      url: 'https://api.spotify.com/v1/me/player/currently-playing?market=GB',
      headers: {
        Authorization: 'Bearer ' + spotifyToken
      }
    });
    
    return new Promise(resolve => resolve(curPlaying.data));
  } catch (e) {
    if (e.response.status === 401) {
      await refreshToken();
      spotifyToken = getSpotifyToken();
      console.log('token refreshed.');
    } else {
      console.log(`songInfo ERR: ${e}`);
    }
    return new Promise(resolve => resolve(false));
  }
}

module.exports = {
  checkForStateChange: checkForStateChange,
  getSongInfo: getSongInfo
};
