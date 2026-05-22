export function useSessionLabel(session: MaybeRefOrGetter<CongressSession | undefined | null>) {
  const siteDataStore = useSiteDataStore()

  const organisationNames = computed(() => {
    const s = toValue(session)
    if (!s?.organisers?.length) return ''
    return (s.organisers as any[])
      .map(o => o.organisation?.short_name ?? o.organisation?.name ?? '')
      .filter(Boolean)
      .join(', ')
  })

  const firstTag = computed(() => {
    const s = toValue(session)
    if (!s?.tags?.length) return ''
    const tagIds = (s.tags as any[]).map(raw => raw?.key ?? raw?.id ?? raw)
    return tagIds
      .map(id => siteDataStore.scientificTags.find(t => t.id === id)?.tag)
      .filter(Boolean)
      .join(', ')
  })

  const primaryColor = computed(() => {
    const s = toValue(session)
    if (!s?.tags?.length) return null
    const raw = (s.tags as any[])[0]
    const tagId = raw?.key ?? raw?.id ?? raw
    return siteDataStore.scientificTags.find(t => t.id === tagId)?.color ?? null
  })

  return { organisationNames, firstTag, primaryColor }
}
