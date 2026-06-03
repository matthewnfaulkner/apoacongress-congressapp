<script setup lang="ts">
definePageMeta({
  layout: 'login',
})



</script>

<template>

    <div class="flex flex-col items-center justify-center gap-4 p-4 h-lvh">
        <UError 
            redirect="/logout"
            :clear="{
                label: 'Log Out',
                color: 'neutral',
                size: 'xl',
                icon: 'i-lucide-arrow-left',
                class: 'rounded-full'
            }"
            :error="{
                statusCode: 403,
                statusMessage: 'Access Denied',
                message: 'You don\'t have permission to access this.'
            
            }"/>
  </div>
</template>