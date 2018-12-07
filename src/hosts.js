const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const route = require('odo-route')
const page = require('page')

const get = (key, value) => {
  try {
    const result = JSON.parse(localStorage.getItem(key))
    if (result) return result
  }
  catch (e) { }
  return value
}
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value))

inject('pod', (hub, exe) => {
  exe.use('hosts', () => Promise.resolve(get('hosts', {})))
  hub.on('add host', host => {
    const hosts = get('hosts', {})
    hosts[host.host] = host
    set('hosts', hosts)
    exe.clearQuery('hosts')
  })
  hub.on('remove host', host => {
    const hosts = get('hosts', {})
    delete hosts[host]
    set('hosts', hosts)
  })
})

route('/', (p) => {
  return { page: 'hosts' }
})

inject('page:hosts', ql.component({
  query: (state, params) => {
    return {
      hosts: ql.query('hosts')
    }
  },
  render: (state, params, hub) => {
    const refresh = (e) => {
      e.preventDefault()
      hub.emit('refresh all')
    }
    document.title = `Hosts · Tumu`
    return h('div.wrapper', [
      h('nav', [
        h('h1', 'Hosts'),
        h('ul.select', Object.keys(state.hosts).map((host) => {
          const action = (e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('TODO: Host actions')
          }
          return h('li', h('a', { attrs: { title: `Logged in as ${state.hosts[host].emailAddress}`, href: `/host/${encodeURIComponent(host)}/` }}, [
            `${host.split('://')[1]}`,
            h('div.action', { on: { click: action } }, '…')
          ]))
        })),
        h('div.page-actions', [
          h('a.btn.icon', { on: { click: refresh }, attrs: { href: '#' } }, '↻'),
          h('a.btn', { attrs: { href: './login/' } }, 'Connect')
        ])
      ]),
      h('article', [])
    ])
  }
}))
