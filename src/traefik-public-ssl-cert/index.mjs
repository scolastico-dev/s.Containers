import { readFileSync, existsSync } from 'fs'
import express from 'express'
import forge from 'node-forge'
import axios from 'axios'

const OPTIONS = {
  STORE_PATH: process.env.STORE_PATH || '/data/acme.json',
  DOMAIN: process.env.DOMAIN,
}

if (!OPTIONS.DOMAIN) throw new Error('ENV: DOMAIN is required')

let cache = null
let chainCache = null

function b64Decode(data) {
  return Buffer.from(data, 'base64').toString('utf8')
}

function getKey() {
  if (cache) return cache
  if (!existsSync(OPTIONS.STORE_PATH)) throw new Error('Key not found')
  const data = JSON.parse(readFileSync(OPTIONS.STORE_PATH, 'utf8'))
  const fullCert = data.dns.Certificates.find(cert => cert.domain.main === OPTIONS.DOMAIN)
  if (!fullCert) throw new Error('Key not found')
  const { key, certificate } = fullCert
  cache = {
    key: b64Decode(key),
    certificate: b64Decode(certificate),
  }
  setTimeout(() => cache = null, 1000 * 60 * 60) // Cache for 1 hour
  return cache
}

async function getChain(certPem) {
  if (chainCache) return chainCache

  const cert = forge.pki.certificateFromPem(certPem)
  const aiaExtension = cert.extensions.find(ext => ext.name === 'authorityInfoAccess')

  if (!aiaExtension || !aiaExtension.caIssuers || !aiaExtension.caIssuers.length) {
    throw new Error('No AIA URL found for CA certificate')
  }

  const caUrl = aiaExtension.caIssuers[0]

  try {
    const { data } = await axios.get(caUrl, { responseType: 'text' })
    chainCache = certPem + '\n' + data
    setTimeout(() => chainCache = null, 1000 * 60 * 60) // Cache for 1 hour
    return chainCache
  } catch (err) {
    throw new Error('Failed to fetch CA certificate: ' + err.message)
  }
}

const app = express()

app.get('/key.pem', (req, res) => {
  try {
    const key = getKey()
    res.send(key.key)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
  }
})

app.get('/cert.pem', (req, res) => {
  try {
    const key = getKey()
    res.send(key.certificate)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
  }
})

app.get('/chain.pem', async (req, res) => {
  try {
    const key = getKey()
    const fullChain = await getChain(key.certificate)
    res.send(fullChain)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
  }
})

app.listen(3000, () => console.log('Server running on port 3000'))
