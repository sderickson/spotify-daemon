import Vue from 'vue'
import TrackRow from 'src/components/TrackRow'

describe('TrackRow.vue', () => {
  describe('duration', () => {
    it('should return the duration in minutes:seconds', () => {
      let TrackRowClass = Vue.extend(TrackRow)
      let vm = new TrackRowClass({ propsData: { duration_ms: 1000 * 65 } })
      expect(vm.duration).to.equal('1:05')
    })
  })
})
