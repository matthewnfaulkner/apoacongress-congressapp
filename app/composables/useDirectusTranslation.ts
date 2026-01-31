import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

export function useDirectusTranslation<T extends { languages_code: string }>(
  translations?: T[] | null
) {
  const { locale } = useI18n()

  const translated = computed<T | null>(() => {
    if (!Array.isArray(translations)) return null

    return translations.find(
      t => t.languages_code === locale.value
    ) ?? null
  })

  return {
    translated,
    locale,
  }
}
