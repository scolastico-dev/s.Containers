import {defineEventHandler, getQuery} from "h3"
import fs from 'fs'
import path from 'path'
import minimatch from "~/lib/minimatch"
import glob from "~/lib/glob"

export default defineEventHandler(async (event) => {
    const file: any = getQuery(event).path
    const paths = process.env.PATHS?.split(',') ?? []
    if (!file) {
        const files = paths
            .map(p => glob.sync(p))
            .flat()
            .filter(f => fs.lstatSync(f).isFile())
            .map(f => {
                const stats = fs.statSync(f)
                return {
                    path: f,
                    permissions: (stats.mode & 0o777).toString(8),
                    user: stats.uid,
                    group: stats.gid,
                    size: stats.size,
                }
            })
        return {error: null, files, login: !!event.context.user}
    }
    const fileExists = paths.some(p => minimatch(file, p))
    if (!fileExists) {
        return {error: 'File is not allowed'}
    } else if (!fs.existsSync(file)) {
        return {error: 'File does not exist'}
    }
    const data = fs.readFileSync(file, 'utf8')
    return {error: null, data}
})
