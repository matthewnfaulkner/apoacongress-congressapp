<script setup lang="ts">
import { useInfiniteScroll } from '@vueuse/core'
import { readItems } from '@directus/sdk';
const { $directus } = useNuxtApp();
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import type { AvatarProps } from '@nuxt/ui'

const search = ref('');
const page = ref(1);
const limit = 15;

const fetchKey = `roles-${Math.random().toString(36).slice(2)}`

const props = defineProps<{
  defaultValue?: Person;
}>()

const emit = defineEmits<{ 
        valueUpdated: [PersonItem],
    }>()

if(props.defaultValue) {
  const { data, status, execute } = await useFetch(`/api/persons/one`, {
      key: `person-${props.defaultValue.id}-${fetchKey}`,
      query: {
        token: undefined,
        id: props.defaultValue.id as string,
        fields: ['id', 'first_name', 'last_name', 'image', 'country'],
      }
    ,
    transform: (data: Person) => ({
      id: data.id,
      name: `${data.first_name} ${data.last_name}`|| '',
      country: data.country,
      avatar: {
        src: getDirectusAssetURL(data.image)
      }
    })
    ,
    lazy: true,
    immediate: true
  })

  watch(data, () => {
    selectedPerson.value = data.value
    emit('valueUpdated', selectedPerson.value)
  })
}

const { data, status, execute } = await useFetch(`/api/persons`, {
    key: 'persons-' + fetchKey,
    params: {search, limit, page},
    query: () => ({
        fields: ['id', 'first_name', 'last_name', 'image', 'country'],
        search: search.value,
        page: page.value,
        limit: limit,
    }),
    transform: (data?: Person[]) =>
        data?.map<PersonItem>(p => ({
            id: p.id,
            name: `${p.first_name} ${p.last_name}`|| '',
            country: p.country,
            avatar: {
                src: getDirectusAssetURL(p.image)
            }
        })) || [],
    lazy: true,
    immediate: false
  }
)

execute();

type PersonItem = {
    id: string
    name: string
    country: Object | null | undefined
    avatar: {}
}

const users = ref<PersonItem[]>([]);

users.value = data.value || [];

watch(data, () => {
  users.value = [...users.value, ...(data.value || [])]
})


const selectMenu = useTemplateRef('selectMenu')


function onSearch(value: string) {
  users.value = [];
  search.value = value
}

const openPersonModal = ref(false);


const handlePersonCreated = (success : boolean, createdPerson? : Person) => {
  openPersonModal.value = false;

  if(success) {
    
    const newPersonItem = {
      id: createdPerson?.id || '',
      name: `${createdPerson?.first_name} ${createdPerson?.last_name}`,
      avatar: {
        src: getDirectusAssetURL(createdPerson?.image)
      },
      country: createdPerson?.country,
    }

    users.value.push(newPersonItem)
    selectedPerson.value = users.value.find(u => u.id === newPersonItem.id);
    emit('valueUpdated', newPersonItem)
  }
  else{
    console.log("Person not created.");
  }
}

const selectedPerson = ref<PersonItem>();

</script>

<template>
  
  <UModal 
    title="Creating New Person"
    v-model:open="openPersonModal"
    >
    <template #body>
      <div class="p-4">
        <PersonForm @person-created="handlePersonCreated"/>
      </div>
    </template>
  </UModal>
  <USelectMenu 
    @update:model-value="($event) => { emit('valueUpdated', $event) }"
    ref="selectMenu" 
    placeholder="Select user" 
    v-model="selectedPerson"
    :items="users" 
    labelKey="name"
    size="lg"
    @update:search-term="onSearch">
    <template #leading="{ modelValue, ui }">
      <UAvatar
        v-if="modelValue"
        v-bind="modelValue.avatar"
        :size="(ui.leadingAvatarSize() as AvatarProps['size'])"
        :class="ui.leadingAvatar()"
      ></UAvatar>
    </template>
    <template #item-description="{ item }">
        <CountryName
            :country-codes="item?.country?.countryCodes"
            locale="en"
        />
    </template>
    <template #content-bottom>
        <small v-if="users.length >= limit-1  "class="text-muted text-right p-2">...too many results. Refine your search by entering perons name.</small>

      <div class="p-2">
        <UButton 
                type="button" 
                variant="outline" 
                color="accent" 
                label="Add New"
                icon="i-lucide-plus"
                size="sm"
                class="m-auto w-full justify-center"
                @click="() => {openPersonModal = true}"
                /></div>
    </template>
    </USelectMenu>
</template>
