import Vue from 'vue'
import App from 'src/App'
import sinon from 'sinon/pkg/sinon'
import api from 'src/api'

describe('App.vue', () => {
  describe('created', () => {
    it('should load tracks', () => {
      var getMe = sinon.spy(api, 'getMe')
      new Vue(App).$mount()
      getMe.restore()
      sinon.assert.calledOnce(getMe)
    })
  })
})
