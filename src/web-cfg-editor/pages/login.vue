<template>
  <div class="flex justify-center items-center min-h-screen">
    <div class="rounded p-4 border border-zinc-600 shadow-xl bg-zinc-900 flex flex-col items-center">
      <p v-if="error" class="text-red-500 mb-2">{{ error }}</p>
      <input placeholder="Username" v-model="username" autocomplete="false">
      <input placeholder="Password" v-model="password" type="password">
      <button class="mt-2" @click="login">Login</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      username: '',
      password: '',
      error: '',
    }
  },
  methods: {
    async login() {
      const {$axios} = useNuxtApp()
      const router = useRouter()
      try {
        const response = await $axios.post('login', {
          username: this.username,
          password: this.password,
        })
        if (response.data.error) {
          if (response.data.code === 403) router.push('/')
          this.error = response.data.error
        } else {
          useRouter().push('/')
        }
      } catch (e) {
        if (e?.response?.status === 403) router.push('/')
        if (e.response && e.response.data && e.response.data.error) {
          this.error = e.response.data.error
        } else {
          this.error = 'Unknown error'
          console.error(e)
        }
      }
    },
  },
}
</script>
