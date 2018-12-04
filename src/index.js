import classes from './index.styl'

// extension points
require('./hosts')
require('./workspaces')
require('./apps')
require('./editor')
require('./login')
require('./error')

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
let params = {}
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

// url handling
const page = require('page')
const route = require('odo-route')
page('*', (e, next) => {
  params = {}
  hub.emit('update', route.exec(e.canonicalPath, () => {
    hub.emit('update', {
      page: 'error',
      message: `${e.canonicalPath} not found`
    })
  }))
  window.scrollTo(0, 0)
})

// execute pods
for (let pod of inject.many('pod')) pod(hub, exe)

// start relay
page.start()
