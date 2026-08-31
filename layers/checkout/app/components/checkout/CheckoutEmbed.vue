<script setup lang="ts">
const props = defineProps<{
  checkoutUrl: string
}>()

const widget = ref<HTMLDivElement | null>(null)

// Ticket Tailor's own inline widget snippet (Event -> Share/Embed), not a
// plain iframe. Reproduced here exactly as given ("Do not change the code or
// the widget may not work properly") except data-url, which is swapped for
// our dynamic per-bundle checkoutUrl instead of a static example one. A
// plain <script> in a Vue template never executes — it has to be built via
// document.createElement and appended, the same as the browser would do
// with a directly pasted <script src> tag.
//
// Clicking through past ticket selection still opens a new tab even with the
// real widget (confirmed against Ticket Tailor's own preview + their docs):
// third-party cookies get blocked inside a cross-origin iframe on some
// browsers, so their checkout deliberately breaks out to a same-origin tab
// to keep the session/cart working rather than silently failing. The only
// real fix is Ticket Tailor's paid custom-domain box office feature (serves
// checkout from our own domain, making it first-party) — not something
// fixable from this side. The fallback link below covers the same case
// manually either way.
function loadWidget(url: string) {
  const container = widget.value
  if (!container) return

  // Clears out whatever a previous checkoutUrl's widget rendered here, in
  // case this component stays mounted across a checkoutUrl change.
  container.innerHTML = ''

  const fallback = document.createElement('div')
  fallback.className = 'tt-widget-fallback'
  fallback.innerHTML = `<p><a href="${url}" target="_blank">Click here to buy tickets</a><br /><small><a href="https://www.tickettailor.com?rf=wdg_331726" class="tt-widget-powered">Sell tickets online with Ticket Tailor</a></small></p>`
  container.appendChild(fallback)

  const script = document.createElement('script')
  script.src = 'https://cdn.tickettailor.com/js/widgets/min/widget.js'
  script.dataset.url = url
  script.dataset.type = 'inline'
  script.dataset.inlineMinimal = 'false'
  script.dataset.inlineShowLogo = 'true'
  script.dataset.inlineBgFill = 'true'
  script.dataset.inlineInheritRefFromUrlParam = ''
  script.dataset.inlineRef = 'website_widget'
  container.appendChild(script)
}

// Watches the ref itself rather than using onMounted: <ClientOnly> doesn't
// mount its slot into the real DOM until after its own onMounted fires, one
// tick later than this component's — so `widget.value` was still null when
// onMounted ran here, and loadWidget's `if (!container) return` guard
// silently no-opped with nothing rendered and no error. Watching `widget`
// fires exactly when the ref actually attaches, regardless of that timing.
watch(
  [widget, () => props.checkoutUrl],
  ([container, url]) => {
    if (container) loadWidget(url)
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-3 items-center">
    <ClientOnly>
      <!--
        Extra classes go on this wrapper, not the .tt-widget div itself —
        widget.js locates its own script tag via a strict
        `element.parentNode.className === 'tt-widget'` equality check, so
        adding anything else to that div's class breaks detection entirely
        (confirmed empirically: it silently stops rendering, no errors).
      -->
      <div class="w-full max-w-xl mx-auto">
        <div ref="widget" class="tt-widget" />
      </div>
    </ClientOnly>
    <p class="text-sm text-description text-center">
      Having trouble with the embedded checkout?
      <a :href="checkoutUrl" target="_blank" rel="noopener" class="text-accent underline">Open it in a new tab</a>.
    </p>
  </div>
</template>
