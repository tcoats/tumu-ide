require('dotenv').config()
const express = require('express')
const app = express()
const http = require('http')
const httpServer = http.createServer(app)
app.use(require('compression')())

app.use('/', express.static(`${__dirname}/../dist`))
app.get('/*', (req, res, next) => {
  res.sendFile('./index.html', { root: './dist' })
})

const port = process.env.TUMU_IDE_PORT || 8082
const pjson = require('../package.json')
httpServer.listen(port, () => {
  console.log(`Nau mai tumu ide · v${require(__dirname + '/../package.json').version} · web@${httpServer.address().address}:${httpServer.address().port}`)
  shutdown = () => Promise.all([
    httpServer.close()
  ])
  .then(() => console.log('E noho rā tumu ide'))
  process.once('SIGTERM', () => shutdown().then(() => process.exit(0)))
  process.once('SIGINT', () => shutdown().then(() => process.exit(0)))
  process.once('SIGUSR2', () => shutdown().then(() =>
    process.kill(process.pid, 'SIGUSR2')))
})
