<template>
  <div>
    <div class="grid grid-cols-3">
      <div class="col-start-2 text-center">
        <div class="relative mx-4">
          <input
              v-model="searchInput"
              placeholder="Search..."
              class="w-full"
          >
          <div class="absolute inset-y-0 right-0 pointer-events-none">
            <div v-if="timeout" class="animate-spin flex items-center h-full">
              <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            </div>
          </div>
        </div>
<!--        <button @click="addBtn">Add</button>-->
      </div>
      <div class="text-end">
        <button v-if="response.login" @click="logout">Logout</button>
      </div>
    </div>
    <div class="mx-2">
      <table class="w-full my-4">
        <thead>
          <tr>
            <th>Path</th>
            <th>Permissions</th>
            <th>User ID</th>
            <th>Group ID</th>
            <th>Size</th>
            <th class="text-end pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in searchResults">
            <td>{{file.path}}</td>
            <td>{{file.permissions}}</td>
            <td>{{file.user}}</td>
            <td>{{file.group}}</td>
            <td>{{makeSizeHumanReadable(file.size)}}</td>
            <td class="text-end">
              <button @click="editingPerms = file">Change Permissions</button>
              <button @click="edit(file.path)">Edit</button>
<!--              <button @click="deleteBtn(file.path)">Delete</button>-->
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="editingPerms" class="absolute inset-0 flex justify-center items-center bg-stone-800/50">
      <div class="permission-edit-card">
        <label>Permissions</label>
        <input v-model.number="editingPerms.permissions" type="number" min="0" max="777">
        <div class="horizontal-line" />
        <label>User ID</label>
        <input v-model.number="editingPerms.user" type="number">
        <div class="horizontal-line" />
        <label>Group ID</label>
        <input v-model.number="editingPerms.group" type="number">
        <div class="horizontal-line" />
        <div>
          <button @click="editingPerms = null">Cancel</button>
          <button @click="savePerms">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    response: {},
    searchInput: '',
    searchResults: [],
    timeout: null,
    editingPerms: null,
  }),
  watch: {
    searchInput() {
      this.search()
    }
  },
  async beforeMount() {
    await this.update()
  },
  beforeUnmount() {
    if (this.timeout) clearTimeout(this.timeout)
  },
  methods: {
    async update() {
      try {
        const {$axios} = useNuxtApp()
        const res = await $axios.get('config')
        this.response = res.data
        this.searchResults = this.response.files
      } catch (e) {
        console.error(e)
        useRouter().push('/login')
      }
    },
    search() {
      if (this.timeout) clearTimeout(this.timeout)
      this.timeout = setTimeout(() => {
        this.timeout = null
        const files = this.response.files
        if (this.searchInput === '') {
          this.searchResults = files
        } else {
          this.searchResults = files.filter(file => file.path.includes(this.searchInput))
        }
      }, 500)
    },
    edit(path) {
      if (path.startsWith('.')) {
        path = '!DOT!' + path.substring(1)
      }
      useRouter().push(`/edit/${path}`)
    },
    savePerms() {
      const data = this.editingPerms
      const path = data.path
      delete data.path
      delete data.size
      const {$axios} = useNuxtApp()
      $axios.put('config', data, {params: {path}})
        .then(() => {
          this.update()
        })
        .catch(e => {
          console.error(e)
        })
      this.editingPerms = null
    },
    logout() {
      const {$axios} = useNuxtApp()
      $axios.get('logout')
        .then(() => {
          useRouter().push('/login')
        })
        .catch(e => {
          console.error(e)
        })
    },
    makeSizeHumanReadable(size) {
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let unit = 0
      while (size > 1024) {
        size /= 1024
        unit++
      }
      return `${size.toFixed(2)} ${units[unit]}`
    }
  }
}
</script>

<style scoped>
.permission-edit-card {
  @apply bg-zinc-800 shadow-2xl rounded-2xl border;
  @apply border-zinc-700 p-4 flex flex-col items-center;
}
.permission-edit-card>input {
  @apply w-full;
}
.horizontal-line {
  @apply border border-zinc-700;
  @apply w-full my-4;
}
</style>