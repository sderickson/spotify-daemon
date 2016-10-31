<template>
  <div id="app">
    <div v-if="loading">
      Loading
    </div>
    <div v-else>
      <div v-if="loggedIn">
        <button v-on:click="logOut">Log out</button>
        <hr />
        <button :disabled="randomizingAlbum" v-on:click="setRandomAlarm">Set Random Alarm</button>
        <div>
          <h1>{{ album.name }}</h1>
          <h2>{{ album.artist }}</h2>
          <img :src="album.imageUrl" width="150" />
        </div>
      </div>
      <div v-else>
        <a href="/api/begin-spotify-oauth">
          Log In
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash'

/* global fetch */

export default {
  data: function () {
    return {
      loading: true,
      loggedIn: false,
      randomizingAlbum: false,
      album: {
        imageUrl: null,
        name: null,
        artist: null
      }
    }
  },
  created: function () {
    fetch('/api/me', { credentials: 'include' })
    .then((res) => res.json())
    .then((json) => {
      this.loading = false
      this.loggedIn = Boolean(json._id)
      if (this.loggedIn) {
        return fetch('/api/alarm-tracks', { credentials: 'include' })
        .then((res) => res.json())
        .then((json) => {
          var track = _.first(json.items).track
          var images = _.sortBy(track.album.images, (image) => image.width)
          var image = _.last(images)
          this.album.imageUrl = image.url
          this.album.name = track.album.name
          var artist = _.first(track.artists)
          this.album.artist = artist.name
        })
      }
    })
  },
  methods: {
    setRandomAlarm: function () {
      this.randomizingAlbum = true
      fetch('/api/random-alarm', { credentials: 'include', method: 'POST' })
        .then((res) => res.json())
        .then((json) => {
          this.randomizingAlbum = false
          var images = _.sortBy(json.images, (image) => image.width)
          var image = _.last(images)
          this.album.imageUrl = image.url
          this.album.name = json.name
          var artist = _.first(json.artists)
          this.album.artist = artist.name
        })
    },
    logOut: function () {
      fetch('/api/logout', { credentials: 'include', method: 'POST' })
        .then(() => { document.location.reload() })
    }
  }
}
</script>

<style lang="scss">
html {
  height: 100%;
}

body {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

#app {
  color: #2c3e50;
  margin-top: -100px;
  max-width: 600px;
  font-family: Source Sans Pro, Helvetica, sans-serif;
  text-align: center;
}

#app a {
  color: #42b983;
  text-decoration: none;
}

.logo {
  width: 100px;
  height: 100px
}
</style>
