import classes from './index.styl'

// extension points
require('./hosts')
require('./host')
require('./workspace')
require('./canvas')
require('./editor')
require('./error')
require('./settings')

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
const ql = require('odoql2')
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
hub.on('refresh all', (p) => {
  exe.clear()
  hub.emit('update', p)
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
if (window.location.pathname == '/') {
  page({ dispatch: false })
  exe.now({
    hosts: ql.query('hosts')
  }).then((results) => {
    if (Object.keys(results.hosts).length != 1) return page()
    const host = Object.values(results.hosts)[0]
    exe.now({
      status: ql.query('status', {
        host: host.host,
        token: host.token
      })
    }).then((results) => {
      if (results.status.workspaces.length != 1) {
        page(`/host/${encodeURIComponent(host.host)}/`)
        return
      }
      const workspace = results.status.workspaces[0]
      page(`/host/${encodeURIComponent(host.host)}/workspace/${workspace.workspaceId}/`)
    })
  })
  // page.start({ dispatch: false })
}
else page()

