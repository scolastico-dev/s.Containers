import {defineEventHandler} from 'h3'
import storage from '~/lib/memorystorage'
import reject from '~/server/lib/reject'

export default defineEventHandler(async (event) => {
    if (!Object.keys(process.env).some(key => key.startsWith('USER_'))) {
        return reject(event, 'Authentication is disabled', 400)
    }
    clearTimeout(event.context.user.timeout)
    storage.removeItem('auth-' + event.context.user.token)
    event.node.res.setHeader(
        'Set-Cookie',
        `x-editor-auth-token=; Expires=${new Date(0).toUTCString()}; Path=/; HttpOnly;` +
        (process.env.INSECURE !== 'true' ? ' Secure;' : '')
    )
    return {error: null}
})
