require('dotenv').config()
const express = require('express')
const http = require('http')
const compression = require('compression')
const bodyParser = require('body-parser')
const WebSocket = require('ws')
const odoWamp = require('odo-wamp')

const app = express()
const httpServer = http.createServer(app)
app.use(compression())
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
app.use(bodyParser.json({ limit: '50mb' }))
app.set('json spaces', 2)

const wsServer = new WebSocket.Server({ server: httpServer })
const wamp = odoWamp(wsServer)

wamp.regrpc('tumu.ide', 'com.tumu.version', (id) =>
  fs.stat('./dist/index.html', (err, info) => {
    if (err != null) {
      console.error(err)
      return wamp.resrpc(id, err)
    }
    wamp.resrpc(id, null, [info.mtime.toString()])
  }))

app.use('/dist', express.static(`${__dirname}/dist`))
app.get('/*', (req, res, next) => {
  res.sendFile('./index.html', { root: './dist' })
})

httpServer.listen(8080, () => {
  console.log(`Nau mai tumu-ide · v${require(__dirname + '/package.json').version} · web@${httpServer.address().address}:${httpServer.address().port}`)
  shutdown = () => Promise.all([
    wsServer.close(),
    httpServer.close()
  ])
  .then(() => console.log('E noho rā tumu-ide'))
  process.once('SIGTERM', () => shutdown().then(() => process.exit(0)))
  process.once('SIGINT', () => shutdown().then(() => process.exit(0)))
  process.once('SIGUSR2', () => shutdown().then(() =>
    process.kill(process.pid, 'SIGUSR2')))
})
