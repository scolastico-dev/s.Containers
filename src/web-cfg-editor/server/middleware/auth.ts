import {defineEventHandler, parseCookies} from "h3"
import storage from "~/lib/memorystorage";
import reject from '~/server/lib/reject'

export default defineEventHandler(async (event) => {
    if (!event.node.req.url?.startsWith('/api')) return
    if (event.node.req.url === '/api/login') return
    if (!Object.keys(process.env).some(key => key.startsWith('USER_'))) return
    const cookies = parseCookies(event)
    const token = cookies['x-editor-auth-token']
    if (!token) {
        return reject(event, 'Not logged in', 401)
    }
    let user = storage.getItem('auth-' + token)
    if (user && user.until < Date.now()) {
        storage.removeItem('auth-' + token)
        user = null
    }
    if (!user) {
        return reject(event, 'Not logged in', 401)
    }
    event.context.user = {token, ...user}
})