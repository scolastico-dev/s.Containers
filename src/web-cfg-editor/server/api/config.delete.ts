import {defineEventHandler, getQuery} from "h3"
import fs from 'fs'
import reject from "~/server/lib/reject";

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    if (!query.path) return reject(event, 'Missing path query parameter', 400)
    const check = event.context.checkFile(query.path)
    if (check) return check
    fs.rmSync(query.path as any)
    return {error: null}
})
