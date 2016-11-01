<template>
  <tr class="track">
    <td>
      <img :src="album.images[2].url" />
    </td>
    <td>{{album.name}}</td>
    <td>{{name}}</td>
    <td>{{duration}}</td>
  </tr>
</template>

<script>
  import moment from 'moment'
  import 'moment-duration-format'

  export default {
    props: ['album', 'artists', 'duration_ms', 'name'],

    computed: {
      duration: function () {
        var d = moment.duration(this.duration_ms)
        return d.format('m:ss')
      }
    }
  }
</script>

<style lang="scss">
</style>
