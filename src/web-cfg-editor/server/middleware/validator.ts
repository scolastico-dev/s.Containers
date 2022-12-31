import {defineEventHandler} from "h3"
import reject from '~/server/lib/reject'
import fs from 'fs'
import minimatch from "~/lib/minimatch";

export default defineEventHandler(async (event) => {
    event.context.checkFile = (path: string) => {
        if (!path) {
            return reject(event, 'Missing path parameter')
        }
        if (!fs.existsSync(path)) {
            return reject(event, 'File does not exist')
        }
        const paths = process.env.PATHS?.split(',') ?? []
        if (!paths.some(p => minimatch(path, p))) {
            return reject(event, 'File is not allowed')
        }
    }
})