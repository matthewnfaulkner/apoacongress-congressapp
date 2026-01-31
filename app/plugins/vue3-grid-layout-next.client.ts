import { defineNuxtPlugin } from '#app'
import { GridLayout, GridItem } from 'vue3-grid-layout-next'


export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('GridLayout', GridLayout as any)
  nuxtApp.vueApp.component('GridItem', GridItem as any)
})
