const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const route = require('odo-route')

inject('page:error', ql.component({
  render: (state, params, hub) => {
    return h('div.wrapper.nav-off', h('article', [
      h('h1', 'Error'),
      h('p.error-message', params.message)
    ]))
  }
}))
