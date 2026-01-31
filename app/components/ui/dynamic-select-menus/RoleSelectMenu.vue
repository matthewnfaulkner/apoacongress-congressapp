<script setup lang="ts">
import { readItem } from '@directus/sdk';

const { $directus } = useNuxtApp();
const search = ref('');
const page = ref(1);
const limit = 15;

const fetchKey = `roles-${Math.random().toString(36).slice(2)}`

const emit = defineEmits<{ 
        valueUpdated: [RoleItem],
    }>()

const props = defineProps<{
  defaultValue?: Role;
}>()


    
const { data, status, execute } = await useFetch(`/api/roles`, {
    key: 'roles-' + fetchKey,
    params: {search, limit, page},
    query: () => ({
        fields: ['id', 'name'],
        search: search.value,
        page: page.value,
        limit: limit,
    }),
    transform: (data?: Role[]) =>
        data?.map<RoleItem>(p => ({
            id: p.id,
            name: p.name|| '',
        })) || [],
    lazy: true,
    immediate: false
  }
)
const selectedRole = ref<RoleItem>()

if(props.defaultValue) {
    const { data } = await useAsyncData <Role>(`roles-${props.defaultValue}-${fetchKey}`, async() => {
      return await $directus.request<Role>(readItem(
        'roles',
        props?.defaultValue?.id,
    ))})
    selectedRole.value = data.value
}

execute();

type RoleItem = {
    id: string
    name: string
}

const users = ref<RoleItem[]>([]);
users.value = data.value || [];
watch(data, () => {
  users.value = [...users.value, ...(data.value || [])]
})


const selectMenu = useTemplateRef('selectMenu')


function onSearch(value: string) {
  users.value = [];
  search.value = value
}

</script>

<template>
  
  <USelectMenu 
    ref="selectMenu" 
    placeholder="Select Role" 
    :items="users" 
    labelKey="name"
    v-model="selectedRole"
    @update:model-value="($event) => { emit('valueUpdated', $event) }"
    @update:search-term="onSearch">
    <template #content-bottom>
        <small v-if="users.length >= limit-1    " class="text-muted text-right p-2">...too many to show all</small>
    </template>
    </USelectMenu>
</template>
