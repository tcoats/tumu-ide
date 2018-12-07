const inject = require('injectinto')

const get = (key, value) => {
  try {
    const result = JSON.parse(localStorage.getItem(key))
    if (result) return result
  }
  catch (e) { }
  return value
}
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value))

const defaultSettings = {
  nav: true,
  info: false
}

inject('pod', (hub, exe) => {
  exe.use('settings', () => Promise.resolve(get('settings', defaultSettings)))
  hub.on('update settings', p => {
    const settings = get('settings', defaultSettings)
    Object.assign(settings, p)
    set('settings', settings)
    exe.clearQuery('settings')
  })
})