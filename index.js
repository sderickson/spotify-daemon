var express = require('express');
var app = express();
var wrap = require('co-express');
var request = require('request');
var Promise = require('bluebird');
Promise.promisifyAll(request);
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var _ = require('lodash');


mongoUrl = 'mongodb://localhost:27017/spotify-daemon'
mongoose.connect(mongoUrl);
app.use(session({
  secret: 'shh',
  store: new MongoStore({mongooseConnection: mongoose.connection}),
  resave: false,
  saveUninitialized: false
}));

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('connected to mongodb');
});

// Don't use Users. Just store tokens and associate the sessions with them.



REDIRECT_URI = 'http://localhost:3001/api/auth-spotify';
CLIENT_ID = '.';
CLIENT_SECRET = '.';

app.get('/api/begin-spotify-oauth', wrap(function* (req, res) {
  redirect_uri = encodeURIComponent(REDIRECT_URI);
  response_type = 'code';
  scope = [
    'user-library-modify',
    'streaming',
    'playlist-modify-private',
    'user-library-read'
  ].join('%20');
  state = '2834018934908';

  query = `https://accounts.spotify.com/authorize/?client_id=${CLIENT_ID}&response_type=${response_type}&redirect_uri=${redirect_uri}&scope=${scope}&state=${state}`
  res.redirect(query)
  //res.send('Hello World!');
}));

app.get('/api/auth-spotify', wrap(function* (req, res) {
  code = req.query.code
  url = 'https://accounts.spotify.com/api/token';
  auth = {
    user: CLIENT_ID,
    pass: CLIENT_SECRET,
  }
  form = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI
  }
  tokenRes = yield request.postAsync({url, form, auth, json: true});
  req.session.accessToken = tokenRes.body.access_token;
  res.send(tokenRes.body)
}));

app.get('/api/alarm-tracks', wrap(function* (req, res) {
  playlist_id = '5hJleJv9tSNik6LKg0vaLB';
  user_id = 'sderickson';
  url = `https://api.spotify.com/v1/users/${user_id}/playlists/${playlist_id}/tracks`
  headers = {
    'Authorization': `Bearer ${req.session.accessToken}`
  }
  playlistResponse = yield request.getAsync({url, headers, json: true})
  res.json(playlistResponse.body)
}));

app.get('/api/random-alarm', wrap(function* (req, res) {
  // Find out how many albums I have
  url = 'https://api.spotify.com/v1/me/albums'
  qs = { limit: 1 }
  headers = {
    'Authorization': `Bearer ${req.session.accessToken}`
  }
  numAlbumsResponse = yield request.getAsync({url, headers, qs, json: true})
  total = numAlbumsResponse.body.total

  // Pick a random one, fetch it
  index = _.random(0, total-1)
  qs = { limit: 1, offset: index }
  randomAlbumResponse = yield request.getAsync({url, headers, qs, json: true})

  // Replace my "Alarm" playlist with the saved tracks in that album
  playlist_id = '5hJleJv9tSNik6LKg0vaLB';
  user_id = 'sderickson';
  url = `https://api.spotify.com/v1/users/${user_id}/playlists/${playlist_id}/tracks`
  json = {
    uris: _.map(randomAlbumResponse.body.items[0].album.tracks.items, (item) => 'spotify:track:'+item.id )
  }
  setTracksResponse = yield request.putAsync({url, json, headers})
  res.json(_.pick(randomAlbumResponse.body.items[0].album, 'name', 'label', 'popularity', 'artists'))
}))

app.listen(3001, function () {
  console.log('Spotify Daemon listening on port 3001!');
});



