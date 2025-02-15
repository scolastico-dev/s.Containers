<template>
  <a :href="data.url" target="_blank">
    <div class="bg-slate-200 hover:bg-slate-400 transition-colors rounded-xl p-2 drop-shadow-xl">
      <img :src="data.img ? data.img : `https://robohash.org/${data.id}?size=400x400`" alt="Robot" class="w-full h-48 object-contain rounded-xl">
      <h1 class="text-center text-xl">{{ data.name }}</h1>
      <p v-if="data.description" class="text-center text-black/90">{{ data.description }}</p>
    </div>
  </a>
</template>

<script setup>
import { defineProps } from 'vue'
const props = defineProps(['data'])
</script>
