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
    let article = null
    if (params.isrenameworkspace) {
      article = h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          ),
          h('h1', `Rename ${workspace.name}`)
        ])
      ])
    }
    else if (params.isdeleteworkspace) {
      const updateName = (e) => {
        hub.emit('update', { name: e.target.value })
      }
      const dothedelete = (e) => {
        e.preventDefault()
        if (params.name != workspace.name) return
        hub.emit('workspace delete', {
          host: params.host,
          token: host.token,
          workspace: params.workspace
        })
      }
      article = h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          ),
          h('h1', `Really delete ${workspace.name}?`)
        ]),
        h('form', { on: { submit: dothedelete } }, [
          h('label', 'Type workspace name to delete'),
          h('input', {
            on: { keyup: updateName },
            attrs: {
              type: 'text',
              autofocus: true
            },
            props: { value: params.name || '' }}),
          h('div.page-actions', [
            h('button.btn', { on: { click: dothedelete } }, 'Delete')
          ])
        ])
      ])
    }
    else if (params.isleaveworkspace) {
      article = h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          ),
          h('h1', `Really leave ${workspace.name}?`)
        ])
      ])
    }
    else if (params.isinviteworkspace) {
      article = h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          ),
          h('h1', `Invite someone to ${workspace.name}`)
        ])
      ])
    }
    else {
      const renamestart = (e) => {
        e.preventDefault()
        hub.emit('update', { isrenameworkspace: true })
      }
      const deletestart = (e) => {
        e.preventDefault()
        hub.emit('update', { isdeleteworkspace: true })
      }
      const leavestart = (e) => {
        e.preventDefault()
        hub.emit('update', { isleaveworkspace: true })
      }
      const invitestart = (e) => {
        e.preventDefault()
        hub.emit('update', { isinviteworkspace: true })
      }
      article = h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          ),
          h('h1', `Settings for ${workspace.name}`)
        ]),
        h('h2', 'Actions'),
        h('p', h('a.btn', { on: { click: renamestart }, attrs: { href: '#' } }, 'Rename workspace')),
        h('p', h('a.btn', { on: { click: deletestart }, attrs: { href: '#' } }, 'Delete workspace')),
        h('p', h('a.btn', { on: { click: leavestart }, attrs: { href: '#' } }, 'Leave workspace')),
        h('p', h('a.btn', { on: { click: invitestart }, attrs: { href: '#' } }, 'Invite member')),
        h('h2', 'Members'),
        h('div', state.workspaceStatus.users.map((user) => {
          const remove = (e) => {
            e.preventDefault()
            console.log('remove user from workspace', user)
          }
          return h('p', [
            h('a.btn.icon', { on: { click: remove }, attrs: { href: '#' } }, '✕'),
            ' ',
            user.emailAddress
          ])
        }))
      ])
    }
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
      article
    ])
  }
}))
