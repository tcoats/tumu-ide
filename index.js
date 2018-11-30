import classes from './index.styl'

// extension points
require('./default')

// snabbdom
const patch = require('snabbdom').init([
  require('snabbdom/modules/class').default,
  require('snabbdom/modules/props').default,
  require('snabbdom/modules/attributes').default,
  require('snabbdom/modules/style').default,
  require('snabbdom/modules/eventlisteners').default,
])
let current = document.querySelector('#root')
const update = (next) => {
  patch(current, next)
  current = next
}

// odo
const Hub = require('odo-hub')
let state = {}
let params = {
  websocket: { isconnected: false },
  lake: {},
  page: 'default'
}
const hub = Hub()

// relay
const inject = require('injectinto')
const exe = require('odoql2/exe')()
exe.missing((queries) => fetch('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ q: queries })
  })
  .then(res => res.json()))
exe.on('update', (results) => {
  state = results
  update(inject.one(`page:${params.page}`)(state, params, hub))
})
hub.on('update', p => {
  Object.assign(params, p)
  exe.run(inject.one(`page:${params.page}`).query(state, params) || {})
})

let currentversion = null
const onConnect = () => socket.call('com.tumu.version', null,  (params) => {
  const version = params.argsList[0]
  if (currentversion != null && currentversion != version) location.reload(true)
  currentversion = version
  hub.emit('update', { websocket: { isconnected: true } })
})
const onDisconnect = () => hub.emit('update', { websocket: { isconnected: false } })
const wampy = require('wampy')
const socket = new wampy.Wampy({
  realm: 'tumu.ide',
  autoReconnect: true,
  maxRetries: Infinity,
  onConnect: onConnect,
  onClose: onDisconnect,
  onReconnect: onDisconnect,
  onReconnectSuccess: onConnect
})

// execute pods
for (let pod of inject.many('pod')) pod(hub, exe, socket)

// start relay
hub.emit('update')
