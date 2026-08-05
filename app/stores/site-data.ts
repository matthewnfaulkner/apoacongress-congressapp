import { defineStore } from 'pinia'

export interface CongressOrganiserOption {
  id: string
  orgType?: string
  name: string
  short_name?: string
  icon?: string
}

interface SiteDataState {
  siteData: Site | {}
  scientificTags: ScientificTag[]
}

export const useSiteDataStore = defineStore('siteData', {
  state: (): SiteDataState => ({
    siteData: {},
    scientificTags: [],
  }),
  actions: {
    getSiteData(){
      return this.siteData;
    },
    setSiteData(siteData: Site) {
      this.siteData = siteData
    },
    setScientificTags(tags: ScientificTag[]) {
      this.scientificTags = tags
    },
    reset() {
      this.siteData = {}
      this.scientificTags = []
    },
  },
})
