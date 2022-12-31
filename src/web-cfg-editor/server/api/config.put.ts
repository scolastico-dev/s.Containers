import {defineEventHandler, getQuery, readBody} from "h3"
import fs from 'fs'
import reject from "~/server/lib/reject";

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    if (!query.path) return reject(event, 'Missing path query parameter', 400)
    const file: any = query.path
    const check = event.context.checkFile(file)
    if (check) return check
    const body = await readBody(event)
    if (!body) {
        return reject(event, 'Missing request body', 400)
    }
    if (!['permissions', 'user', 'group', 'data'].some(k => !!body[k])) {
        return reject(event, 'Invalid request body', 400)
    }
    if (body.user) {
        if (body.group) {
            fs.chownSync(file, body.user, body.group)
        } else reject(event, 'Missing group parameter', 400)
    }
    if (body.permissions) fs.chmodSync(file, String(body.permissions))
    if (body.data) fs.writeFileSync(file, body.data)
    return {error: null}
})
