<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { createItem, readItems, deleteItem, updateItem, readRelation, readRelationByCollection } from '@directus/sdk';
import { Time } from '@internationalized/date'
import { toTimeValue } from '@/utils/time-utils';
import * as z from 'zod'
import { type CongressEvent, type CongressSession, type Symposium, type Talk } from '~~/shared/types/schema';
import type { TreeItem } from '@nuxt/ui'
import { useSortable } from '@vueuse/integrations/useSortable'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import type { EditEventMode } from '../grid/EditEventModal.vue';

const toast = useToast();

type Mode = 'create' | 'update';

interface eventTypeSchema {
    label: string,
    value: {
        id: string,
        collection: string,
    }
}


interface eventTypeField {
    id: number,
    meta: {
        one_allowed_collections: string[],
    }

}

const props = defineProps<{
    parent: CongressEvent | null,
    session: CongressSession | null,
    event: CongressEvent | null,
    timeSubDivison: number,
    mode: EditEventMode,
}>()

const isSubEvent = props.parent == null ? false : true;

const sessionLength = computed(() => {
    if(isSubEvent) return props?.parent?.duration || 90;

    return minutesBetween(props?.session?.starttime, props?.session?.endtime);
})

const emit = defineEmits<{ 
        eventCreated: [boolean,CongressEvent],
        eventUpdated: [boolean,CongressEvent],
    }>()

const { $directus } = useNuxtApp();

const { data } = await useAsyncData <eventTypeField>('congress_events_type', async() => {
    return await $directus.request<eventTypeField>(readRelation('congress_events_type', 'item'));
})

const eventTypes = ref([]);

if(data.value) {
    //console.log(data.value)
}

eventTypes.value = data.value?.meta.one_allowed_collections.map(collection => ({label: collection, value: collection}));

const state = reactive({
  id: props.event? props.event.id : undefined,
  title: props.event? props.event.title : undefined,
  eventType: props.event? props.event.type[0]?.collection :undefined,
  eventSubType: props.event? props.event.type[0]?.item : undefined,
  relative_start: props.event? props.event.relative_start : 0,
  duration: props.event? props.event.duration : props.timeSubDivison,
  assignments: props.event? props.event.assignments.map((assignment, index) => ({
    sort: index,
    ...assignment
  })) : [{
    id: undefined,
    role: undefined,
    person: undefined,
    sort: 0,
  }]
})


const schema = z.object({
    id: z.any().nullable(),
    title: z.string('Title is required').max(25, 'Max 25 Characters'),
    relative_start: z.number().gte(0, 'Relative Start cannot be less than 0'),
    eventType: z.string('Select an Event Type'),
    eventSubType: z.any(),
    duration: z.number().gte(0, 'Duration Must be greater than 0'),
    assignments: z.array(
        z.object({
            role: z.object({
                id: z.string().optional(),
                name: z.string().optional(),
            }).optional(),
            person: z.object({
                id: z.string().optional(),
                name: z.string().optional(),
            }
            ).optional(),
            sort: z.number().optional(),
        }).optional()
    ).optional()
}).superRefine((data, ctx) => {
    if(props.session !== null && !isSubEvent) {
        
        

        if(data.duration > sessionLength.value - data.relative_start) {
            ctx.addIssue({
                path: ["duration"],
                message: "Event duration longer than session.",
                code: z.ZodIssueCode.custom,
            });
        }
        
        if(data.relative_start >= sessionLength.value) {
            ctx.addIssue({
                path: ["duration"],
                message: "Relative start cannot come after session ends.",
                code: z.ZodIssueCode.custom,
            });
        }
    }
    if(props.parent !== null && isSubEvent) {
        
        if(data.duration > sessionLength.value - data.relative_start) {
            ctx.addIssue({
                path: ["duration"],
                message: "Event duration longer than Parent Event.",
                code: z.ZodIssueCode.custom,
            });
        }

        if(data.relative_start >= sessionLength.value) {
            ctx.addIssue({
                path: ["duration"],
                message: "Relative start cannot come after parent event ends.",
                code: z.ZodIssueCode.custom,
            });
        }
    }
});

type Schema = typeof schema

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {
	try {
        const formData = submission.data as Schema;
        const assignments = formData.assignments.filter(assignment => assignment.role).sort((a, b) => a.sort - b.sort);
        const payload = {
                title: formData.title,
                relative_start: formData.relative_start,
                duration: formData.duration,
                session: isSubEvent ? undefined : props.session?.id,
                parent: isSubEvent ? props.parent?.id : undefined,
                assignments: assignments,
                type: [
                    {
                    collection: formData.eventType,
                    item: formData.eventSubType,
                    }
                ]
                
            }
        if(props.mode == 'create') {
            const response = await $directus.request<CongressEvent>(createItem('congress_events', payload))
            const responseWithAssign : CongressEvent = {
            ...response,
            assignments: assignments,
            type: [
                {   
                    id: response.type[0],
                    collection: formData.eventType,
                    item: formData.eventSubType,
                }
            ]
            }

            toast.add({ title: 'Success', description: `Event Created`, color: 'accent'})

            emit('eventCreated', true, responseWithAssign);
            

        }else if (formData.id) {
            const response = await $directus.request<CongressEvent>(updateItem('congress_events', formData.id ,payload))

            const responseWithAssign : CongressEvent = {
                ...response,
                assignments: assignments,
                type: [
                    {   
                        id: response.type[0],
                        collection: formData.eventType,
                        item: formData.eventSubType,
                    }
                ]
            }

            toast.add({ title: 'Success', description: `Event Updated`, color: 'accent'})

            emit('eventUpdated', true, responseWithAssign);
        }
        
        
	} catch (e) {
        console.log(e);
	} 
};

const eventSubTypes = ref([]);

const fetchEventTypes = async () => {
    const selectedEventType = state.eventType;

    eventSubTypes.value = [];

    if(selectedEventType === undefined) return;

    const valid = eventTypes.value.find(type => type.value === selectedEventType)
    if(!valid) return;
    
    try {
        const response = await $directus.request<Plenary[] | Workshop[] | Talk[] | Symposium[]>(readItems(selectedEventType))
        eventSubTypes.value = response.map(subType => ({label: subType.name, value: subType.id}));
    }
    catch (error) {
        console.log(error)
    }
}
const tree = useTemplateRef<HTMLElement>('tree')


useSortable(tree, state.assignments, {
  animation: 150,
  ghostClass: 'opacity-50',
  onUpdate: (e: any) => moveItem(e.oldIndex, e.newIndex)
})

function moveItem(oldIndex: number, newIndex: number) {
  if (oldIndex === newIndex) return

  const moved = state.assignments.find(assignment => assignment.sort == oldIndex);
  if(!moved) return;
  

  if(oldIndex > newIndex) {
    for (const assignment of state.assignments) {
        if (assignment.sort >= newIndex && assignment.sort < oldIndex) {
            assignment.sort++
        }
    }
    
  }
  else if(oldIndex < newIndex) {
    for (const assignment of state.assignments) {
        if (assignment.sort <= newIndex && assignment.sort > oldIndex) {
            assignment.sort--
        }
    }
  }
  moved.sort = newIndex;
}

const assignmentCount = computed(() => state.assignments.length)

</script>

<template>
  <UForm :state="state" class="space-y-4" @submit="handleSubmit($event)" :schema="schema">
    <UFormField name="id" hidden>
      <UInput hidden v-model="state.id" />
    </UFormField>
    <div class="flex flex-col md:flex-row justify-between">
        <UFormField label="Event Type" name="eventType" class="w-full lg:w-50" required> 
                <USelect :items="eventTypes" placeholder="Type"  class="w-50" v-model="state.eventType" @vue:mounted="fetchEventTypes" @change="fetchEventTypes"></USelect>
        </UFormField>
        <!--<UFormField label="Event Sub Type" name="eventSubType" class="w-full lg:w-50" required>
                <USelect :items="eventSubTypes" :disabled="eventSubTypes.length <= 0" placeholder="SubType"  class="w-50" v-model="state.eventSubType" ></USelect>
                
        </UFormField>-->
        <div class="w-full lg:w-50">
            <BaseEventTypeForm v-model="state.eventSubType" :type="{collection: state?.eventType || '', item: state.eventSubType || '' }" ></BaseEventTypeForm>
        </div>
    </div>
    <div class="flex flex-col md:flex-row justify-between">
        <UFormField label="Event Title" name="title" class="w-full lg:w-50" required>
            <UInput v-model="state.title"/>
        </UFormField>
    </div>
    <div class="flex flex-col md:flex-row justify-between">
        <UFormField label="Relative Start Time" name="relative_start" class="w-full lg:w-50" required help="Start Time in minutes relative to Session Start time.">
            <UInputNumber :min="0" :max="sessionLength - timeSubDivison" :step="timeSubDivison" :default-value="0" color="accent"  v-model="state.relative_start"/>
        </UFormField>
        <UFormField label="Duration" name="duration" class="w-full lg:w-50" required help="Event duration (Minutes)">
            <UInputNumber :min="timeSubDivison" :max="sessionLength" :step="timeSubDivison" :default-value=timeSubDivison color="accent" v-model="state.duration"/>
        </UFormField>
    </div>
    <div>
        <UFormField required label="Roles" name="assignments" size="xl" class="text-center pb-5" >
            <UTree :items="state.assignments" :nested="false" ref="tree">
                <template #item="{item, index}">
                    <RoleSelectMenu :default-value="item.role" size="lg" @value-updated="(updatedItem) => {item.role = updatedItem}"/>
                    <PersonSelectMenu :default-value="item.person" size="lg" @value-updated="(updatedItem) => {item.person = updatedItem}"/> 
                    <UButton 
                    icon="i-lucide-trash" 
                    variant="outline" 
                    color="secondary" 
                    type="button" 
                    size="xl"
                    @click="state.assignments.splice(index, 1)">
                </UButton>
                </template>
            </UTree>
            <UButton 
                type="button" 
                variant="solid" 
                color="accent" 
                icon="i-lucide-plus"
                size="xl"
                class="m-auto"
                @click="state.assignments.push(reactive({ role: undefined, person: undefined, sort: assignmentCount }))"/>
        </UFormField>
    </div>
    <UButton type="submit" color="accent" variant="solid" :label="mode == 'update' ? 'Update Event' : 'Create Event'">
    </UButton>
  </UForm>
</template>

