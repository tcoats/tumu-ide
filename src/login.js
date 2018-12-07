const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const route = require('odo-route')
const qrcode = require('qrcode')
const page = require('page')

const connection = require('./connection')
const fixHostUrl = require('./fixhosturl')

inject('pod', (hub, exe) => {
  hub.on('login', (params) => {
    const host = fixHostUrl(params.host)
    const socket = connection(host, null, {
      open: () => socket.send('login', params.emailAddress),
      login_complete: (token) => {
        socket.close()
        hub.emit('add host', {
          host: host,
          emailAddress: params.emailAddress,
          token: token
        })
        .then(() => page(`../${encodeURIComponent(host)}/`))
      },
      login_secret_generated: (secret) => {
        socket.close()
        qrcode.toDataURL(`otpauth://totp/SecretKey?secret=${secret}`)
          .then((secretSrc) => hub.emit('update', {
            secret,
            secretSrc,
            challenge: true
          }))
      },
      login_challenge: () => {
        socket.close()
        hub.emit('update', { challenge: true })
      },
      socketError: (err) => {
        socket.close()
        console.error(err)
        if (err.message) alert(err.message)
        else alert(JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
      }
    })
  })
  hub.on('login code', (params) => {
    const host = fixHostUrl(params.host)
    const socket = connection(host, null, {
      open: () => socket.send('login_code', {
        emailAddress: params.emailAddress,
        code: params.code
      }),
      login_complete: (token) => {
        socket.close()
        hub.emit('add host', {
          host: host,
          emailAddress: params.emailAddress,
          token: token
        })
        .then(() => page(`/host/${encodeURIComponent(host)}/`))
      },
      login_failure: (err) => {
        socket.close()
        console.error(err)
        if (err.message) alert(err.message)
        else alert(JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
      },
      socketError: (err) => {
        socket.close()
        console.error(err)
        if (err.message) alert(err.message)
        else alert(JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
      }
    })
  })
})

route('/login/', (p) => {
  return { page: 'login' }
})

inject('page:login', ql.component({
  query: (state, params) => {
    return {
      hosts: ql.query('hosts')
    }
  },
  render: (state, params, hub) => {
    if (!params.host) params.host = 'localhost:8081'
    if (params.challenge) {
      const updateCode = (e) => {
        hub.emit('update', { code: e.target.value })
      }
      const loginCode = (e) => {
        e.preventDefault()
        if (!params.host || !params.emailAddress) return
        hub.emit('login code', {
          host: params.host,
          emailAddress: params.emailAddress,
          code: params.code
        })
      }
      return h('div.wrapper', [
        h('nav', [
          h('header', [
            h('a.btn.icon', { attrs: { href: `/` } }, '←'),
            h('h1', `${params.host}`)
          ]),
          h('form', { on: { submit: loginCode } }, [
            ...(params.secret ? [
              h('label', 'Authenticator secret'),
              h('img.secret', { attrs: { src: params.secretSrc }}),
              h('div.secret', params.secret)
            ]: []),
            h('label', 'Authenticator code'),
            h('input', {
              on: { keyup: updateCode },
              attrs: {
                type: 'text',
                placeholder: 'e.g. 123456',
                autofocus: true
              },
              props: { value: params.code || '' }}),
            h('div.page-actions', [
              h('button.btn', { on: { click: loginCode } }, 'Login')
            ])
          ])
        ])
      ])
    }
    const updatehost = (e) => {
      hub.emit('update', { host: e.target.value })
    }
    const updateEmailAddress = (e) => {
      hub.emit('update', { emailAddress: e.target.value })
    }
    const login = (e) => {
      e.preventDefault()
      if (!params.host || !params.emailAddress) return
      hub.emit('login', { host: params.host, emailAddress: params.emailAddress })
    }
    return h('div.wrapper', [
      h('nav', [
        h('header', [
          h('a.btn.icon', { attrs: { href: `/` } }, '←'),
          h('h1', 'Connect')
        ]),
        h('form', { on: { submit: login } }, [
          h('label', 'Host'),
          h('input', {
            on: { keyup: updatehost },
            attrs: {
              type: 'text',
              autofocus: true,
              placeholder: 'e.g. localhost:8081',
              value: params.host } }),
          h('label', 'Email address'),
          h('input', {
            on: { keyup: updateEmailAddress },
            attrs: {
              type: 'text',
              placeholder: 'e.g. bob@example.com',
              value: params.emailAddress } }),
          h('div.page-actions', [
            h('button.btn', 'Login')
          ])
        ])
      ])
    ])
  }
}))
