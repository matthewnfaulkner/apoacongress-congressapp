import { defineStore } from 'pinia'

interface SiteDataState {
  siteData: Site | {}
}

export const useSiteDataStore = defineStore('siteData', {
  state: (): SiteDataState => ({
    siteData: {},
  }),
  actions: {
    getSiteData(){
      return this.siteData;
    },
    setSiteData(siteData: Site) {
      this.siteData = siteData
    },
    reset() {
      // Reset state to initial values
      this.siteData = {}
    },
  },
})
