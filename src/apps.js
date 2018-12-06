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

})

route('/host/:host/workspace/:workspace/', (p) => {
  return { page: 'apps', host: p.params.host, workspace: p.params.workspace }
})

inject('page:apps', ql.component({
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
    if (!state.status) state.status = { workspaces: [] }
    let workspace = null
    for (let w of state.status.workspaces)
      if (w.workspaceId == params.workspace)
        workspace = w
    if (!workspace)
      return inject.one('page:error')(state, { message: 'Workspace not found' }, hub)
    const refresh = (e) => {
      e.preventDefault()
      hub.emit('refresh all')
    }
    return h('div.wrapper', [
      h('h1', 'Applications'),
      h('ul.select', workspace.apps.map((app) => {
        const action = (e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('TODO: App actions')
        }
        return h('li', h('a', { attrs: { href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/app/${app.appId}/` } }, [
          `${app.name} · ${app.appId}`,
          h('div.action', { on: { click: action } }, '…')
        ]))
      })),
      h('div.page-actions', [
        h('a.btn.icon', { on: { click: refresh }, attrs: { href: '#' } }, '↻'),
        //h('a.btn.icon', { attrs: { href: '#' } }, '＋'),
        h('a.btn.icon', { attrs: { href: `/host/${encodeURIComponent(params.host)}/` } }, '✕')
      ])
    ])
  }
}))
