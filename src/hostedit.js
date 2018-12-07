const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const route = require('odo-route')
const page = require('page')

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
