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
var moment = require('moment');

app.use(express.static('./dist'))
var isProduction = process.env.SPOTIFY_DAEMON_ENV === 'prod';

MONGO_HOST = process.env.SPOTIFY_DAEMON_MONGO_HOST || 'localhost';
MONGO_PORT = process.env.SPOTIFY_DAEMON_MONGO_PORT || '27017';
MONGO_DB = process.env.SPOTIFY_DAEMON_MONGO_DB || 'spotify-daemon'

mongoUrl = `mongodb://${MONGO_HOST}:${MONGO_HOST}/${MONGO_DB}`
mongoose.connect(mongoUrl);

var UserSchema = new mongoose.Schema({
  spotifyUser: {
    display_name: String,
    id: String
  },
  spotifyAuth: {
    accessToken: String,
    refreshToken: String,
    scope: String,
    expires: String
  }
})
User = mongoose.model('User', UserSchema);

app.use(session({
  secret: process.env.SPOTIFY_DAEMON_SESSION_SECRET || 'shh',
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


REDIRECT_URL = process.env.SPOTIFY_DAEMON_REDIRECT_URL || 'http://localhost:3001/api/auth-spotify';
CLIENT_ID = process.env.SPOTIFY_DAEMON_CLIENT_ID;
CLIENT_SECRET = process.env.SPOTIFY_DAEMON_CLIENT_SECRET;

app.get('/api/begin-spotify-oauth', wrap(function* (req, res) {
  redirect_uri = encodeURIComponent(REDIRECT_URL);
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
    redirect_uri: REDIRECT_URL
  }
  tokenRes = yield request.postAsync({url, form, auth, json: true});

  url = 'https://api.spotify.com/v1/me';
  headers = {
    'Authorization': `Bearer ${tokenRes.body.access_token}`
  }
  meRes = yield request.getAsync({url, headers, json: true});

  user = yield User.findOne({'spotifyUser.id': meRes.body.id});
  if(!user)
    user = new User({spotifyUser: _.pick(meRes.body, 'id', 'display_name')});
  user.set('spotifyAuth', {
    accessToken: tokenRes.body.access_token,
    refreshToken: tokenRes.body.refresh_token,
    scope: tokenRes.body.scope,
    expires: moment().add(tokenRes.body.expiresIn, 'seconds').toISOString(),
    created: new Date().toISOString()
  })
  yield user.save()

  req.session.userId = user.id;
  res.send(tokenRes.body)
}));

app.use('/api/*', wrap(function* (req, res, next) {
  if(req.session.userId) {
    req.user = yield User.findById(req.session.userId)
  }
  next()
}))

app.get('/api/alarm-tracks', wrap(function* (req, res) {
  playlist_id = '5hJleJv9tSNik6LKg0vaLB';
  user_id = 'sderickson';
  url = `https://api.spotify.com/v1/users/${user_id}/playlists/${playlist_id}/tracks`
  headers = {
    'Authorization': `Bearer ${req.user.get('spotifyAuth.accessToken')}`
  }
  playlistResponse = yield request.getAsync({url, headers, json: true})
  res.json(playlistResponse.body)
}));

app.get('/api/random-alarm', wrap(function* (req, res) {
  // Find out how many albums I have
  url = 'https://api.spotify.com/v1/me/albums'
  qs = { limit: 1 }
  headers = {
    'Authorization': `Bearer ${req.user.get('spotifyAuth.accessToken')}`
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

port = process.env.SPOTIFY_DAEMON_PORT || 3001;
app.listen(port, function () {
  console.log(`Spotify Daemon listening on port ${port}!`);
});



