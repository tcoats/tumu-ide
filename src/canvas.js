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
  return { page: 'canvas', host: p.params.host, workspace: p.params.workspace }
})

inject('page:canvas', ql.component({
  query: (state, params) => {
    const hosts = get('hosts', {})
    if (!hosts[params.host]) return {}
    return {
      status: ql.query('status', {
        host: params.host,
        token: hosts[params.host].token
      }),
      settings: ql.query('settings')
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
    document.title = `${workspace.name} · Tumu`
    const refresh = (e) => {
      e.preventDefault()
      hub.emit('refresh all')
    }
    const hidenav = (e) => {
      e.preventDefault()
      hub.emit('update settings', { nav: false })
        .then(() => hub.emit('update'))
    }
    const shownav = (e) => {
      e.preventDefault()
      hub.emit('update settings', { nav: true })
        .then(() => hub.emit('update'))
    }
    return h('div.wrapper', { class: { 'nav-off': !state.settings.nav } }, [
      h('nav', [
        h('header', [
          h('a.btn.icon', { attrs: { href: `/host/${encodeURIComponent(params.host)}/` } }, '←'),
          h('h1', workspace.name)
        ]),
        h('a.select.selected', { attrs: { href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/` } }, 'Canvas'),
        h('a.select', { attrs: { href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/settings/` } }, 'Workspace settings'),
        h('h2', 'Applications'),
        h('ul.select', workspace.apps.map((app) => {
          return h('li', h('a', { attrs: { title: `ID: ${app.appId}`, href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/app/${app.appId}/` } }, `${app.name}`))
        })),
        h('div.page-actions', [
          h('a.btn.icon', { on: { click: refresh }, attrs: { href: '#' } }, '↻'),
          //h('a.btn.icon', { attrs: { href: '#' } }, '＋'),
          h('a.btn.icon', { on: { click: hidenav }, attrs: { href: '#' } }, '⇤')
        ])
      ]),
      h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          )
        ])
      ])
    ])
  }
}))
