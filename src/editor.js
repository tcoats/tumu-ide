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
      })
    }
  },
  render: (state, params, hub) => {
    console.log(state.code)
    const code = params.code || state.code
    const hosts = get('hosts', {})
    if (!hosts[params.host])
      return inject.one('page:error')(state, { message: 'Host not found' }, hub)
    if (!code)
      return inject.one('page:error')(state, { message: 'App not found' }, hub)
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
    return h('div.wrapper', [
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
                lineNumbers: true
              })
            vnode.data.codemirror.on('change', (instance) => {
              hub.emit('update', { code: instance.getValue() })
            })
          }
        }
      }),
      h('div.page-actions', [
        h('a.btn.icon', { on: { click: upload }, attrs: { title: 'Upload', href: '#' } }, '↑'),
        h('a.btn.icon', { attrs: { title: 'Close', href: `/host/${encodeURIComponent(params.host)}/workspace/${params.workspace}/` } }, '✕')
      ])
    ])
  }
}))
