const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')

inject('section:workspace:settings', ql.component({
  render: (state, params, hub) => {
    const renamestart = (e) => {
      e.preventDefault()
      hub.emit('update', { section: 'rename' })
    }
    const deletestart = (e) => {
      e.preventDefault()
      hub.emit('update', { section: 'delete' })
    }
    const leavestart = (e) => {
      e.preventDefault()
      hub.emit('update', { section: 'leave' })
    }
    const invitestart = (e) => {
      e.preventDefault()
      hub.emit('update', { section: 'invite' })
    }
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
        h('h1', `Settings for ${params.workspace.name}`)
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
}))