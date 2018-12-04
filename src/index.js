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

const test = () => {
  const connection = require('./connection')
  const fixHostUrl = require('./fixhosturl')
  const host = fixHostUrl('localhost:8081')
  const emailAddress = 'thomas.coats@gmail.com'
  const socket = connection(host, null, {
    open: () => socket.send('login', emailAddress),
    login_complete: (token) => {
      socket.close()
      console.log('Logged in', token)
    },
    login_secret_generated: (secret) => {
      console.log('Generated secret', secret)
    },
    login_challenge: () => {
      console.log('Login challenge')
    },
    login_failure: () => {
      socket.close()
      console.error('Login failure')
    }
  })
}
test()


// execute pods
for (let pod of inject.many('pod')) pod(hub, exe, socket)

// start relay
hub.emit('update')
