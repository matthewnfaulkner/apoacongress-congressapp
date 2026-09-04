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
  getters: {
    // Derived from siteData rather than its own state — doesn't change
    // within a session, so pages needing it for SEO meta (title/description)
    // can just read this instead of each recomputing the same
    // congress[0]/venue/dates lookup locally.
    congressInfo(state) {
      const site = state.siteData as Site
      const congress = site.congress?.[0]
      const venue = congress && typeof congress !== 'string' ? congress.venue : null
      const title = congress && typeof congress !== 'string' ? congress.title : null
      const tagline = congress && typeof congress !== 'string' ? site.tagline : null
      const startdate = congress && typeof congress !== 'string' ? congress.startdate : null
      const enddate = congress && typeof congress !== 'string' ? congress.enddate : null
      const formattedStartDate = startdate ? new Date(startdate).toLocaleDateString('en-Uk', { day: 'numeric' }) : null
      const formattedEndDate = enddate ? new Date(enddate).toLocaleDateString('en-Uk', { day: 'numeric', month: 'long', year: 'numeric' }) : null

      return { venue, title, tagline, formattedStartDate, formattedEndDate }
    },
  },
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
