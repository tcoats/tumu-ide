const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const route = require('odo-route')
const codemirror = require('codemirror')
require('codemirror/mode/javascript/javascript')

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
  exe.use('app code', (params) => new Promise((resolve, reject) => {
    const socket = connection(params.host, params.token, {
      open: () => socket.send('app_code', params.app),
      app_code_complete: (code) => {
        socket.close()
        resolve(code)
      },
      socketError: (err) => {
        socket.close()
        reject(err)
      }
    })
  }))
  hub.on('app publish', (params) => new Promise((resolve, reject) => {
    const socket = connection(params.host, params.token, {
      open: () => socket.send('app_publish', {
        app: params.app,
        code: params.code
      }),
      app_publish_complete: () => {
        socket.close()
        resolve()
      },
      socketError: (err) => {
        socket.close()
        reject(err)
      }
    })
  }))
})

route('/host/:host/workspace/:workspace/app/:app/', (p) => {
  return {
    page: 'editor',
    host: p.params.host,
    workspace: p.params.workspace,
    app: p.params.app
  }
})

inject('page:editor', ql.component({
  query: (state, params) => {
    const hosts = get('hosts', {})
    if (!hosts[params.host]) return {}
    return {
      code: ql.query('app code', {
        host: params.host,
        token: hosts[params.host].token,
        app: params.app
      }),
      status: ql.query('status', {
        host: params.host,
        token: hosts[params.host].token
      }),
      settings: ql.query('settings')
    }
  },
  render: (state, params, hub) => {
    const code = params.code || state.code
    const hosts = get('hosts', {})
    if (!hosts[params.host])
      return inject.one('page:error')(state, { message: 'Host not found' }, hub)
    if (code == null || code == undefined)
      return inject.one('page:error')(state, { message: 'App not found' }, hub)
    let workspace = null
    for (let w of state.status.workspaces)
      if (w.workspaceId == params.workspace)
        workspace = w
    if (!workspace)
      return inject.one('page:error')(state, { message: 'Workspace not found' }, hub)
    let app = null
    for (let a of workspace.apps)
      if (a.appId == params.app)
        app = a
    if (!app)
      return inject.one('page:error')(state, { message: 'App not found' }, hub)
    document.title = `${app.name} · Tumu`
    const host = hosts[params.host]
    const upload = (e) => {
      e.preventDefault()
      hub.emit('app publish', {
        host: params.host,
        token: host.token,
        app: params.app,
        code: code
      })
    }
    const refresh = (e) => {
      e.preventDefault()
      hub.emit('refresh all', { code: null })
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
    const hideinfo = (e) => {
      e.preventDefault()
      hub.emit('update settings', { info: false })
        .then(() => hub.emit('update'))
    }
    const showinfo = (e) => {
      e.preventDefault()
      hub.emit('update settings', { info: true })
        .then(() => hub.emit('update'))
    }
    return h('div.wrapper', { class: {
        'nav-off': !state.settings.nav,
        'info-on': state.settings.info
      } }, [
      h('nav', [
        h('header', [
          h('a.btn.icon', { attrs: { href: `/host/${encodeURIComponent(params.host)}/` } }, '←'),
          h('h1', 'Applications')
        ]),
        h('ul.select', workspace.apps.map((a) => {
          const action = (e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('TODO: App actions')
          }
          return h('li', h('a', { class: { selected: a.appId == app.appId }, attrs: { title: `ID: ${a.appId}`, href: `/host/${encodeURIComponent(params.host)}/workspace/${workspace.workspaceId}/app/${a.appId}/` } }, [
            `${a.name}`,
            h('div.action', { on: { click: action } }, '…')
          ]))
        })),
        h('div.page-actions', [
          h('a.btn.icon', { on: { click: refresh }, attrs: { href: '#' } }, '↻'),
          //h('a.btn.icon', { attrs: { href: '#' } }, '＋'),
          h('a.btn.icon', { on: { click: hidenav }, attrs: { href: '#' } }, '⇤')
        ])
      ]),
      h('article.editor', [
        h('header', [
          ...(!state.settings.nav
            ? [h('a.btn.icon', { on: { click: shownav }, attrs: { href: '#' } }, '⇥')]
            : []
          )
        ]),
        h('div', {
          hook: {
            insert: (vnode) => {
              vnode.data.codemirror = codemirror(
                (el) => {
                  vnode.elm.parentNode.replaceChild(el, vnode.elm)
                  vnode.elm = el
                },
                {
                  value: code,
                  mode: 'javascript',
                  tabSize: 2,
                  lineWrapping: true,
                  lineNumbers: true,
                  autofocus: true,
                  smartIndent: false,
                  electricChars: false
                })
              vnode.data.codemirror.on('change', (instance) => {
                if (instance.issetting) return instance.issetting = false
                hub.emit('update', { code: instance.getValue() })
              })
            },
            postpatch: (oldVnode, vnode) => {
              const instance = oldVnode.data.codemirror
              vnode.data.codemirror = instance
              if (params.code == null || params.code == undefined) {
                instance.issetting = true
                instance.setValue(code)
              }
            }
          }
        }),
        h('div.page-actions', [
          h('a.btn.icon', { on: { click: upload }, attrs: { title: 'Upload', href: '#' } }, '↑'),
          ...(!state.settings.info
            ? [h('a.btn.icon', { on: { click: showinfo }, attrs: { title: 'Hide', href: '#' } }, '⇤')]
            : [])
        ])
      ]),
      h('div.info', [
        h('header', [
          ...(state.settings.info
            ? [h('a.btn.icon', { on: { click: hideinfo }, attrs: { title: 'Show', href: '#' } }, '⇥')]
            : []),
          h('h1', 'Logs')
        ])
      ])
    ])
  }
}))
