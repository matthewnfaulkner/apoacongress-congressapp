<template>
  <span>
    <template v-for="(name, index) in countryNames" :key="index">
      {{ name }}<span v-if="index < countryNames.length - 1">, </span>
    </template>
  </span>
</template>

<script>
export default {
  name: "CountryNames",
  props: {
    countryCodes: {
      type: Array,
      required: true
    },
    locale: {
      type: String,
      default: "en"
    }
  },
  computed: {
    countryNames() {
      try {
        const regionNames = new Intl.DisplayNames(
          [this.locale],
          { type: "region" }
        )

        return this.countryCodes.map(code =>
          regionNames.of(code?.toUpperCase()) || code
        )
      } catch (e) {
        return this.countryCodes
      }
    }
  }
}
</script>
