# Spotify Daemon

A web interface and set of scripts for managing my personal playlists.

## Plans

* Add log out button
* Refactor, test server. Create a server folder, move the models and endpoints
  and services into appropriate folders. Probably create a spotify library for
  calling endpoints. Should figure out how to run mocha/istanbul on a running server.
* Improve playlist generation
  * Make playlist last about a target length. Roughly, add albums until over
    a target length, then remove tracks until close to the target length? Will
    also need to extend the front-end to show images for all albums.
  * Keep a list of recent albums. Do not use them for alarms, or at least put
    them to the end of the line.
* Build settings interface. Save settings in User. Should be able to set:
  * playlist that will be overwritten
  * time it will be overwritten
  * target time length (also need to change algorithm to keep adding albums until
    it reaches this target).
* Add a 'daily playlist'. Longer version of the alarm playlist, meant to be played
  over the course of the whole day. Probably more complicated, like lighter stuff
  at the beginning of the day, more energizing in the afternoon, relaxing and more
  wordy in the evening. Might work better as a series of playlists. Also would draw
  from other sources, maybe recommendations?

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# run unit tests
npm run unit

# run e2e tests
npm run e2e

# run all tests
npm test
```

For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
