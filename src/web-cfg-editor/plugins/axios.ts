// @ts-ignore
import axios from 'axios'

export default defineNuxtPlugin(() => {
    const axiosInstance = axios.create({
        baseURL: '/api/',
    })
    return {provide: {axios: axiosInstance}}
})
