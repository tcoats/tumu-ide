module.exports = (host) => {
  if (!host) return host
  if (host.indexOf('ws://') == -1) return `ws://${host}`
  return host
}