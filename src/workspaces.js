const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const route = require('odo-route')

const connection = require('./connection')

const get = (key, value) => {
  try {
    const result = JSON.parse(localStorage.getItem(key))
    if (result) return result
  }
  catch (e) { }
  return value
}

inject('pod', (hub, exe) => {
  exe.use('status', (params) => new Promise((resolve, reject) => {
    const socket = connection(params.host, params.token, {
      open: () => socket.send('status'),
      status: (status) => {
        socket.close()
        resolve(status)
      },
      socketError: (err) => {
        socket.close()
        reject(err)
      }
    })
  }))
})

route('/host/:host/', (p) => {
  return { page: 'workspaces', host: p.params.host }
})

inject('page:workspaces', ql.component({
  query: (state, params) => {
    const hosts = get('hosts', {})
    if (!hosts[params.host]) return {}
    return {
      status: ql.query('status', {
        host: params.host,
        token: hosts[params.host].token
      })
    }
  },
  render: (state, params, hub) => {
    if (!state.status)
      return inject('page:error')(state, { message: 'Host not found' }, hub)
    return h('div.wrapper', [
      h('h1', `Workspaces`),
      h('ul.select', state.status.workspaces.map((workspace) => {
        const action = (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('action')
        }
        return h('li', h('a', { attrs: { href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/` } }, [
          `${workspace.name} · ${workspace.workspaceId}`,
          h('div.action', { on: { click: action } }, '…')
        ]))
      })),
      h('div.page-actions', [
        h('a.btn.icon', { attrs: { href: '/' } }, '✕')
      ])
    ])
  }
}))
