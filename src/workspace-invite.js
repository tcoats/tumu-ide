const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')

inject('section:workspace:invite', ql.component({
  render: (state, params, hub) => {
    const shownav = (e) => {
      e.preventDefault()
      hub.emit('update settings', { nav: true })
        .then(() => hub.emit('update'))
    }
    return h('article', [
      h('header', [
        ...(!state.settings.nav
          ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
          : []
        ),
        h('h1', `Invite someone to ${params.workspace.name}`)
      ])
    ])
  }
}))