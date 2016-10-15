var express = require('express');
var app = express();
var wrap = require('co-express');
var request = require('request');
var Promise = require('bluebird');
Promise.promisifyAll(request);

REDIRECT_URI = 'http://localhost:3001/api/auth-spotify';
CLIENT_ID = '.';
CLIENT_SECRET = '.';

app.get('/api/begin-spotify-oauth', wrap(function* (req, res) {
  redirect_uri = encodeURIComponent(REDIRECT_URI);
  response_type = 'code';
  scope = ['user-library-modify', 'streaming', 'playlist-modify-private'].join('%20');
  state = '2834018934908';

  query = `https://accounts.spotify.com/authorize/?client_id=${CLIENT_ID}&response_type=${response_type}&redirect_uri=${redirect_uri}&scope=${scope}&state=${state}`
  console.log('query', query);
  res.redirect(query)
  //res.send('Hello World!');
}));

app.get('/api/auth-spotify', wrap(function* (req, res) {
  code = req.query.code
  console.log({code})
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
  console.log('token res', JSON.stringify(tokenRes.body))
  res.send(tokenRes.body)
}));

app.listen(3001, function () {
  console.log('Example app listening on port 3001!');
});
