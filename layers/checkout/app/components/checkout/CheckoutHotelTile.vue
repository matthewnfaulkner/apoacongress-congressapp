<script setup lang="ts">
import type { CheckoutHotel } from '../../types/checkout'

defineProps<{
  hotel: CheckoutHotel
}>()

defineEmits<{ select: [] }>()

const showDetails = ref(false)
</script>

<template>
  <div class="flex flex-col border border-input rounded-lg overflow-hidden">
    <button type="button" class="flex flex-col text-left hover:border-accent transition-colors" @click="$emit('select')">
      <div class="aspect-video bg-elevated overflow-hidden justify-end flex">
         <UBadge v-if="hotel.tagline" size="xl" color="info" variant="solid" class="w-fit absolute m-2 font-heading text-xl font-bold" :label="hotel.tagline"></UBadge>
        <img v-if="hotel.image" :src="hotel.image" :alt="hotel.name" class="w-full h-full object-cover" />
      </div>
      <div class="p-4 pb-0 flex flex-col gap-1">
        <h3 class="font-semibold text-foreground">{{ hotel.name }}
          <UButton 
            icon="i-lucide-arrow-right"
            variant="ghost" 
            color="neutral" 
            size="xl" 
            class="rounded-none rounded-t-none rounded-b-lg "
            />
        </h3>
        <div v-if="hotel.starRating" class="flex items-center gap-0.5 text-warning">
          <UIcon v-for="n in hotel.starRating" :key="n" name="i-material-symbols-star-rate" class="size-4 fill-current"  />
        </div>
       
      </div>
      <div>
        
      </div>
      
    </button>

    <UButton 
      type="button" 
      class="text-md text-accent underline text-left p-4 pt-1" 
      @click="() => {showDetails = true}"
      label="View hotel details"
    />

    <CheckoutHotelDetailsModal v-model:open="showDetails" :hotel-id="hotel.id" />
  </div>
</template>
