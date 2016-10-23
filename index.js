var express = require('express');
var app = express();
var wrap = require('co-express');
var co = require('co');
var request = require('request');
var Promise = require('bluebird');
Promise.promisifyAll(request);
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var _ = require('lodash');
var moment = require('moment-timezone');

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

UserSchema.method('refreshAuth', co.wrap(function*() {
  expiresSoon = this.get('spotifyAuth.expires') < moment().add(1, 'minute').toISOString()
  if(!expiresSoon) { return Promise.resolve() }
  code = this.get('spotifyAuth.refreshToken')
  url = 'https://accounts.spotify.com/api/token';
  auth = {
    user: CLIENT_ID,
    pass: CLIENT_SECRET,
  }
  form = {
    grant_type: 'refresh_token',
    refresh_token: this.get('spotifyAuth.refreshToken')
  }
  tokenRes = yield request.postAsync({url, form, auth, json: true});
  if(tokenRes.statusCode >= 400) {
    throw new Error('Token could not be refreshed.')
  }
  this.set('spotifyAuth', {
    accessToken: tokenRes.body.access_token,
    refreshToken: tokenRes.body.refresh_token || this.get('spotifyAuth.refreshToken'),
    scope: tokenRes.body.scope,
    expires: moment().add(tokenRes.body.expires_in, 'seconds').toISOString(),
    created: new Date().toISOString()
  })
  yield this.save()
}))

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
    expires: moment().add(tokenRes.body.expires_in, 'seconds').toISOString(),
    created: new Date().toISOString()
  })
  yield user.save()

  req.session.userId = user.id;
  res.redirect('/');
}));

app.use('/api/*', wrap(function* (req, res, next) {
  if(req.session.userId) {
    req.user = yield User.findById(req.session.userId)
    yield req.user.refreshAuth()
  }
  next()
}))

app.get('/api/me', function (req, res) {
  if(req.user) {
    res.send(_.omit(req.user.toObject(), 'spotifyAuth'))
  }
  else {
    res.send({})
  }
})

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

setRandomAlarm = function* (user) {
  // Find out how many albums I have
  url = 'https://api.spotify.com/v1/me/albums'
  qs = { limit: 1 }
  headers = {
    'Authorization': `Bearer ${user.get('spotifyAuth.accessToken')}`
  }
  numAlbumsResponse = yield request.getAsync({url, headers, qs, json: true})
  if(numAlbumsResponse.statusCode >= 400)
    throw new Error('Could not get number of albums: ' + JSON.stringify(numAlbumsResponse.body, null, '\t'))

  total = numAlbumsResponse.body.total

  // Pick a random one, fetch it
  index = _.random(0, total-1)
  qs = { limit: 1, offset: index }
  randomAlbumResponse = yield request.getAsync({url, headers, qs, json: true})
  if(randomAlbumResponse.statusCode >= 400)
    throw new Error('Could not fetch random album: ' + JSON.stringify(randomAlbumResponse.body, null, '\t'))

  // Replace my "Alarm" playlist with the saved tracks in that album
  playlist_id = '5hJleJv9tSNik6LKg0vaLB';
  user_id = 'sderickson';
  url = `https://api.spotify.com/v1/users/${user_id}/playlists/${playlist_id}/tracks`
    json = {
      uris: _.map(randomAlbumResponse.body.items[0].album.tracks.items, (item) => 'spotify:track:'+item.id )
  }
  setTracksResponse = yield request.putAsync({url, json, headers})
  if(setTracksResponse.statusCode >= 400)
    throw new Error('Could not set alarm playlist tracks: ' + JSON.stringify(setTracksResponse.body, null, '\t'))

  return randomAlbumResponse.body
}

app.post('/api/random-alarm', wrap(function* (req, res) {
  randomAlbumResponseBody = yield setRandomAlarm(req.user)
  res.json(randomAlbumResponseBody.items[0].album)
}))

port = process.env.SPOTIFY_DAEMON_PORT || 3001;
app.listen(port, function () {
  console.log(`Spotify Daemon listening on port ${port}!`);
});

sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))
sleepUntil = (momentInstance) => {
  return sleep(momentInstance.diff(moment()))
}

co(function*() {
  while(true) {
    try {
      nextAlarmReset = moment.tz("America/Los_Angeles")
      if (nextAlarmReset.hour() >= 12) { nextAlarmReset.add(1, 'day') }
      nextAlarmReset.set({hour: 12, minute:0, second:0})
      yield sleepUntil(nextAlarmReset);
      var user = yield User.findOne({'spotifyUser.id': 'sderickson'})
      yield user.refreshAuth()
      randomAlbumResponseBody = yield setRandomAlarm(user);
      console.log(`Randomly selected: ${randomAlbumResponseBody.items[0].album.name}`)
    }
    catch(e) {
      console.log('Threw error trying to update alarm.', e)
    }
  }
})
.catch((e) => {
  console.log('e!', e)
})



