const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const codemirror = require('codemirror')
require('codemirror/mode/javascript/javascript')

inject('page:default', ql.component({
  query: (state, params) => {
    return {}
  },
  render: (state, params, hub) => {
    const click = (e) => {
      hub.emit('update', { thing: !params.thing })
    }
    if (params.thing) return h('div.wrapper', [
      h('div', { on: { click: click } }, 'Hello')
    ])
    return h('div.wrapper', [
      h('a#upload', { attrs: { title: 'Upload', href: '#' } }, '↑'),
      h('a#close', { attrs: { title: 'Close', href: '#' } }, '✕'),
      h('div', {
        hook: {
          insert: (vnode) => {
            vnode.data.codemirror = codemirror(
              (el) => {
                vnode.elm.parentNode.replaceChild(el, vnode.elm)
                vnode.elm = el
              },
              {
                value: `const h = require('snabbdom/h').default
const ql = require('odoql2')
const inject = require('injectinto')
const codemirror = require('codemirror')
require('codemirror/mode/javascript/javascript')

inject('page:default', ql.component({
  query: (state, params) => {
    return {}
  },
  render: (state, params, hub) => {
    const click = (e) => {
      hub.emit('update', { thing: !params.thing })
    }
    if (params.thing) return h('div.wrapper', [
      h('div', { on: { click: click } }, 'Hello')
    ])
    return h('div.wrapper', [
      h('a#upload', { attrs: { title: 'Upload', href: '#' } }, '↑'),
      h('a#close', { attrs: { title: 'Close', href: '#' } }, '✕'),
      h('div', {
        hook: {
          insert: (vnode) => {
            vnode.data.codemirror = codemirror(
              (el) => {
                vnode.elm.parentNode.replaceChild(el, vnode.elm)
                vnode.elm = el
              },
              {
                value: 'alert();',
                mode: 'javascript',
                tabSize: 2,
                lineWrapping: true,
                lineNumbers: true
              })
          },
          destroy: (vnode) => {
            console.log(vnode.data)
            //vnode.elm
          }
        }
      })
    ])
  }
}))
`,
                mode: 'javascript',
                tabSize: 2,
                lineWrapping: true,
                lineNumbers: true
              })
          },
          destroy: (vnode) => {
            console.log(vnode.data)
            //vnode.elm
          }
        }
      })
    ])
  }
}))
