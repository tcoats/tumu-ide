const socketError = (err) => {
  if (err.code == 'ECONNREFUSED')
    console.error(`Connection to tumu host refused`)
  console.error(err)
}

module.exports = (host, token, callbacks) => {
  if (!callbacks.socketError) callbacks.socketError = socketError
  let fin = false
  const socket = new WebSocket(host, token)
  socket.onopen = () => callbacks.open()
  socket.onerror = (err) => {
    if (fin) return
    socket.close()
    callbacks.socketError(err)
  }
  socket.onmessage = (e) => {
    let payload = null
    try { payload = JSON.parse(e.data) }
    catch (e) {
      socket.close()
      callbacks.socketError('protocol violation')
      return
    }
    if (!Array.isArray(payload) || payload.length != 2) {
      socket.close()
      callbacks.socketError('protocol violation')
      return
    }
    if (callbacks[payload[0]]) callbacks[payload[0]](payload[1])
    else if (payload[0] == 'error') {
      socket.close()
      callbacks.socketError(payload[1])
    }
    else callbacks.socketError(`callback not found ${payload[0]}`)
  }
  if (callbacks.close) socket.onclose = callbacks.close
  return {
    send: (command, params) => socket.send(JSON.stringify([command, params])),
    close: () => socket.close()
  }
}