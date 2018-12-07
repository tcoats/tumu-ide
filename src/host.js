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
      hosts: ql.query('hosts'),
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
    const host = state.hosts[params.host]
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
    const logout = (e) => {
      e.preventDefault()
      hub.emit('logout', host)
        .then(() => page('/'))
    }
    let article = null
    if (params.iscreateworkspace) {
      const create = (e) => {
        e.preventDefault()
        if (!params.name) return
        hub.emit('workspace create', {
          host: params.host,
          token: host.token,
          name: params.name
        })
      }
      const updateName = (e) => {
        hub.emit('update', { name: e.target.value })
      }
      article = h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          ),
          h('h1', 'Creating new workspace')
        ]),
        h('form', { on: { submit: create } }, [
          h('label', 'Workspace Name'),
          h('input', {
            on: { keyup: updateName },
            attrs: {
              type: 'text',
              autofocus: true
            },
            props: { value: params.name || '' }}),
          h('div.page-actions', [
            h('button.btn', { on: { click: create } }, 'Create')
          ])
        ])
      ])
    }
    else {
      const createstart = (e) => {
        e.preventDefault()
        hub.emit('update', { iscreateworkspace: true })
      }
      article = h('article', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          ),
          h('p', `Logged in as: ${state.hosts[params.host].emailAddress}`),
          h('h2', 'Actions'),
          h('p', h('a.btn', { on: { click: logout }, attrs: { href: '#' } }, `Logout of ${nicehost}`)),
          h('p', h('a.btn', { on: { click: createstart }, attrs: { href: '#' } }, 'Create new workspace'))
        ])
      ])
    }
    return h('div.wrapper', { class: { 'nav-off': !state.settings.nav } }, [
      h('nav', [
        h('header', [
          h('a.btn.icon', { attrs: { href: `/` } }, '←'),
          h('h1', nicehost)
        ]),
        h('a.select.selected', { attrs: { href: `/host/${encodeURIComponent(params.host)}/` } },'Host settings'),
        h('h2', 'Workspaces'),
        h('ul.select', state.status.workspaces.map((workspace) => {
          return h('li', h('a', { attrs: { title: `ID: ${workspace.workspaceId}`, href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/` } }, workspace.name))
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
