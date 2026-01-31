import { VueZoomable} from 'vue-zoomable'


export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('VueZoomable', VueZoomable as any)
})
