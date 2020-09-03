const axios = require('axios').default;
const config = require('./config.json');

async function searchForLyrics(trackName, primaryArtist, artistNames, albumName, duration, songUri) {
  try {
    const mxmRes = await axios({
      url: 'https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get',
      params: {
        format: 'json',
        q_track: trackName,
        q_artist: primaryArtist,
        q_artists: artistNames,
        q_album: albumName,
        user_language: 'en',
        q_duration: duration / 1000,
        tags: 'nowplaying',
        namespace: 'lyrics_synched',
        part: 'lyrics_crowd,user,lyrics_verified_by',
        track_spotify_id: songUri,
        f_subtitle_length_max_deviation: '1',
        subtitle_format: 'mxm',
        usertoken: config.Musixmatch.usertoken,
        signature: config.Musixmatch.signature,
        signature_protocol: 'sha1',
        app_id: 'web-desktop-app-v1.0'
      },
      headers: {
        Cookie: config.Musixmatch.cookie
      }
    });
    const MacroCalls = mxmRes.data.message.body.macro_calls;
    if (MacroCalls['userblob.get'].message.header.status_code === 200 || MacroCalls['track.subtitles.get'].message.header.status_code === 200) {
      const Lyrics = MacroCalls['userblob.get'].message.header.status_code === 200 ? MacroCalls['userblob.get'].message.body.subtitles : JSON.parse(MacroCalls['track.subtitles.get'].message.body.subtitle_list[0].subtitle.subtitle_body);
      let sortedLyrics = {};
      Lyrics.forEach((lyric) => {
        sortedLyrics[lyric.time.total.toFixed(2)] = lyric.text;
      });
      return new Promise(resolve => resolve(sortedLyrics));
    } else {
      console.log('hm: ' + JSON.stringify(MacroCalls));
      return new Promise(resolve => resolve(false));
    }
    
  } catch (e) {
    console.log(`searchForLyrics ERR: ${e}`);
    return new Promise(resolve => resolve(false));
  }
}

module.exports.searchForLyrics = searchForLyrics;