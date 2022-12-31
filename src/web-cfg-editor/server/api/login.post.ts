import {defineEventHandler, readBody} from 'h3'
import Argon2 from 'argon2'
import Crypto from 'crypto'
import storage from '~/lib/memorystorage'
import reject from '~/server/lib/reject'

export default defineEventHandler(async (event) => {
    if (!Object.keys(process.env).some(key => key.startsWith('USER_'))) {
        return reject(event, 'Authentication is disabled', 403)
    }
    if (event.context.user) {
        return reject(event, 'Already logged in', 403)
    }
    const {username, password} = await readBody(event)
    if (!username || !password) return reject(event, 'Invalid body', 400)
    const envKey = 'USER_' + username.toUpperCase()
    const envPassword = process.env[envKey]
    if (!envPassword) return reject(event, 'Invalid username or password', 401)
    if (!(await Argon2.verify(envPassword, password))) {
        return reject(event, 'Invalid username or password', 401)
    }
    const token = Crypto.randomBytes(64).toString('hex')
    const expires = Date.now() + 8 * 60 * 60 * 1000
    const timeout = setTimeout(() => {
        storage.removeItem('auth-' + token)
    }, expires - Date.now())
    storage['auth-' + token] = {username, until: expires, timeout}
    event.node.res.setHeader(
        'Set-Cookie',
        `x-editor-auth-token=${token}; Expires=${new Date(expires).toUTCString()}; Path=/; HttpOnly;` +
        (process.env.INSECURE !== 'true' ? ' Secure;' : '')
    )
    return {error: null}
})
