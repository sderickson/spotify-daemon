import Vue from 'vue'
import App from 'src/App'
import sinon from 'sinon/pkg/sinon'
import api from 'src/api'

describe('App.vue', () => {
  describe('created', () => {
    it('should load tracks', () => {
      sinon.stub(api, 'getMe').returns(Promise.resolve({ _id: '1234' }))
      sinon.stub(api, 'getAlarmTracks').returns(Promise.resolve({ items: [] }))
      let vm = new Vue(App).$mount()
      return vm.load.then(() => {
        sinon.assert.calledOnce(api.getMe)
        sinon.assert.calledOnce(api.getAlarmTracks)
        api.getMe.restore()
        api.getAlarmTracks.restore()
      })
    })
  })
})
