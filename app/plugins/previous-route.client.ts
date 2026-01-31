export default defineNuxtPlugin(() => {
  const previousRoute = useState<string | null>('previousRoute', () => null)

  const router = useRouter()

  router.afterEach((to, from) => {
    previousRoute.value = from.fullPath || null
  })
})