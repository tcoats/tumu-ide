const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const route = require('odo-route')
const page = require('page')

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
  exe.use('workspace status', (params) => new Promise((resolve, reject) => {
    const socket = connection(params.host, params.token, {
      open: () => socket.send('workspace_status', params.workspace),
      workspace_status_complete: (status) => {
        socket.close()
        resolve(status)
      },
      socketError: (err) => {
        socket.close()
        reject(err)
      }
    })
  }))
  hub.on('workspace create', (params) => new Promise((resolve, reject) => {
    const socket = connection(params.host, params.token, {
      open: () => socket.send('workspace_create', params.name),
      workspace_created: (workspaceId) => {
        socket.close()
        resolve()
        exe.clearQuery('status')
        page(`/host/${encodeURIComponent(params.host)}/workspace/${workspaceId}/`)
      },
      socketError: (err) => {
        socket.close()
        reject(err)
      }
    })
  }))
  hub.on('workspace delete', (params) => new Promise((resolve, reject) => {
    const socket = connection(params.host, params.token, {
      open: () => socket.send('workspace_delete', params.workspace),
      workspace_delete_complete: () => {
        socket.close()
        resolve()
        exe.clearQuery('status')
        page(`/host/${encodeURIComponent(params.host)}/`)
      },
      socketError: (err) => {
        socket.close()
        reject(err)
      }
    })
  }))
  hub.on('workspace rename', (params) => new Promise((resolve, reject) => {
    const socket = connection(params.host, params.token, {
      open: () => socket.send('workspace_rename', {
        workspace: params.workspace,
        name: params.name
      }),
      workspace_renamed: () => {
        socket.close()
        resolve()
        exe.clearQuery('status')
        page(`/host/${encodeURIComponent(params.host)}/workspace/${encodeURIComponent(params.workspace)}/settings/`)
      },
      socketError: (err) => {
        socket.close()
        reject(err)
      }
    })
  }))
})

route('/host/:host/workspace/:workspace/settings/', (p) => {
  return { page: 'workspace', host: p.params.host, workspace: p.params.workspace }
})

inject('page:workspace', ql.component({
  query: (state, params) => {
    const hosts = get('hosts', {})
    if (!hosts[params.host]) return {}
    return {
      hosts: ql.query('hosts'),
      status: ql.query('status', {
        host: params.host,
        token: hosts[params.host].token
      }),
      workspaceStatus: ql.query('workspace status', {
        host: params.host,
        token: hosts[params.host].token,
        workspace: params.workspace
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
    const host = state.hosts[params.host]
    document.title = `${workspace.name} · Tumu`
    const childparams = Object.assign({}, params, {
      workspace: workspace,
      host: host
    })
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
    const refresh = (e) => {
      e.preventDefault()
      hub.emit('refresh all')
    }
    return h('div.wrapper', { class: { 'nav-off': !state.settings.nav } }, [
      h('nav', [
        h('header', [
          h('a.btn.icon', { attrs: { href: `/host/${encodeURIComponent(params.host)}/` } }, '←'),
          h('h1', workspace.name)
        ]),
        h('a.select', { attrs: { href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/` } }, 'Canvas'),
        h('a.select.selected', { attrs: { href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/settings/` } }, 'Workspace settings'),
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
      (inject.one(params.section
       ?`section:workspace:${params.section}`
       : 'section:workspace:settings'))(state, childparams, hub)
    ])
  }
}))
