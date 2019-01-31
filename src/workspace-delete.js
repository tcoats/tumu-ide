const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')

inject('section:workspace:delete', ql.component({
  render: (state, params, hub) => {
    const shownav = (e) => {
      e.preventDefault()
      hub.emit('update settings', { nav: true })
        .then(() => hub.emit('update'))
    }
    const updateName = (e) => {
      hub.emit('update', { name: e.target.value })
    }
    const dothedelete = (e) => {
      e.preventDefault()
      if (params.name != params.workspace.name) return
      hub.emit('workspace delete', {
        host: params.host.hosr,
        token: params.host.token,
        workspace: params.workspace
      })
    }
    return h('article', [
      h('header', [
        ...(!state.settings.nav
          ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
          : []
        ),
        h('h1', `Really delete ${params.workspace.name}?`)
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
}))