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
        <table >
          <track-row v-for="track in tracks" :album="track.album" :artists="track.artists" :duration_ms="track.duration_ms" :name="track.name"></track-row>
        </table>
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
import TrackRow from 'components/TrackRow'
import api from './api'

export default {
  data: function () {
    return {
      loading: true,
      loggedIn: false,
      randomizingAlbum: false,
      tracks: []
    }
  },

  created: function () {
    // Check if logged, and if so, load tracks
    this.loading = true
    api.getMe().then((json) => {
      this.loggedIn = Boolean(json._id)
      if (this.loggedIn) {
        return this.loadTracks()
      }
    })
    .then(() => { this.loading = false })
  },

  methods: {
    loadTracks: function () {
      return api.getAlarmTracks().then((json) => {
        this.tracks = _.map(json.items, (item) => item.track)
      })
    },
    setRandomAlarm: function () {
      this.randomizingAlbum = true
      api.setRandomAlarm()
        .then(this.loadTracks)
        .then(() => { this.randomizingAlbum = false })
    },
    logOut: function () {
      api.logout().then(() => { document.location.reload() })
    }
  },
  components: {
    'track-row': TrackRow
  }
}
</script>

<style lang="scss">
</style>
