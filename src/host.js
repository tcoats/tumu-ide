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
  return { page: 'host', host: p.params.host }
})

inject('page:host', ql.component({
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
    if (!state.status)
      return inject.one('page:error')(state, { message: 'Host not found' }, hub)
    const nicehost = params.host.split('://')[1]
    document.title = `${nicehost} · Tumu`
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
          h('a.btn.icon', { attrs: { href: `/` } }, '←'),
          h('h1', `Workspaces`)
        ]),
        h('ul.select', state.status.workspaces.map((workspace) => {
          const action = (e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('TODO: Workspace actions')
          }
          return h('li', h('a', { attrs: { title: `ID: ${workspace.workspaceId}`, href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/` } }, [
            `${workspace.name}`,
            h('div.action', { on: { click: action } }, '…')
          ]))
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

route('/host/:host/edit/', (p) => {
  return { page: 'host:edit', host: p.params.host }
})

inject('page:host:edit', ql.component({
  query: (state, params) => {
    return {
      hosts: ql.query('hosts'),
      settings: ql.query('settings')
    }
  },
  render: (state, params, hub) => {
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
    const host = state.hosts[params.host]
    const logout = (e) => {
      e.preventDefault()
      hub.emit('logout', host)
        .then(() => page('/'))
    }
    const nicehost = params.host.split('://')[1]
    document.title = `${nicehost} · Tumu`
    return h('div.wrapper', { class: { 'nav-off': !state.settings.nav } }, [
      h('nav', [
        h('h1', 'Hosts'),
        h('ul.select', Object.keys(state.hosts).map((host) => {
          const action = (e) => {
            e.preventDefault()
            e.stopPropagation()
            page(`/host/${encodeURIComponent(host)}/edit/`)
          }
          return h('li', h('a', { attrs: { title: `Logged in as ${state.hosts[host].emailAddress}`, href: `/host/${encodeURIComponent(host)}/` }}, [
            `${host.split('://')[1]}`,
            h('div.action', { on: { click: action } }, '…')
          ]))
        })),
        h('div.page-actions', [
          h('a.btn.icon', { on: { click: refresh }, attrs: { href: '#' } }, '↻'),
          h('a.btn.icon', { on: { click: hidenav }, attrs: { href: '#' } }, '⇤')
        ])
      ]),
      h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          ),
          h('h1', nicehost)
        ]),
        h('p', `Logged in as: ${state.hosts[params.host].emailAddress}`),
        h('div.page-actions', [
          h('button.btn', { on: { click: logout } }, 'Logout')
        ])
      ])
    ])
  }
}))
