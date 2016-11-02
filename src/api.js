/* global fetch */

function makeAPICall (url, options = {}) {
  options.credentials = 'include'
  return fetch(url, options).then((res) => res.json())
}

export default {
  getMe: (options) => makeAPICall('/api/me', options),
  getAlarmTracks: (options) => makeAPICall('/api/alarm-tracks', options),
  setRandomAlarm: (options = {}) => {
    options.method = 'POST'
    return makeAPICall('/api/random-alarm', options)
  },
  logout: (options = {}) => {
    options.method = 'POST'
    return makeAPICall('/api/logout', options)
  }
}
