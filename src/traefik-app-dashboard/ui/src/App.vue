<template>
  <div class="min-h-screen bg-slate-600 p-4">
    <div class="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-4" style="grid-template-rows: masonry;">
      <card v-for="i in data" :key="i.name" :data="i" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import card from './Card.vue'
import axios from 'axios'
const data = ref([])
onMounted(async () => {
  data.value = (await axios.get('data.json')).data
})
</script>
