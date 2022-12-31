import wasm from 'vite-plugin-wasm';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    ssr: false,
    css: ['~/assets/css/main.css'],
    postcss: {
        plugins: {
            tailwindcss: {},
            autoprefixer: {},
        },
    },
    sourcemap: {
        server: true,
        client: process.env.SOURCEMAP === 'true',
    },
})
