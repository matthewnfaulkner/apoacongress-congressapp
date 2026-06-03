<script setup lang="ts">

definePageMeta({
  layout: 'login',
})

const { $directus } = useNuxtApp();

$directus.logout();

</script>
  <template>
    <div class="flex flex-col items-center justify-center gap-4 p-4 h-lvh">
      <UPageCard class="w-full max-w-md ">
          <Headline headline="Sign Out Successful" class="text-center"/>
          <UButton label="Sign In" color="accent" class="text-center w-fit m-auto" icon="i-lucide-undo-2" to="/admin_login" />
      </UPageCard>
    </div>
</template>