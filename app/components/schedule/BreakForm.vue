<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { createItem, readItems, deleteItem, updateItem } from '@directus/sdk';
import { Time } from '@internationalized/date'
import { toTimeValue } from '@/utils/time-utils';
import * as z from 'zod'

type Mode = 'create' | 'update';

const props = defineProps<{
    mode: Mode,
    timeSubDivision: number,
    rooms: VenueRoom[],
    startTime: string,
    endTime?: string,
    schedule: string,
    yLimit: number,
    editing: boolean,
    id: string,
    name: string,

}>()

const emit = defineEmits<{ 
        breakCreated: [boolean,CongressBreak?],
        breakUpdated: [boolean,CongressBreak?],
    }>()

const startTimeString = toTimeValue(props.startTime);
const startTime = shallowRef(new Time(startTimeString.hour, startTimeString.minute, 0))

const endTimeString = props.editing ? toTimeValue(props?.endTime) : startTimeString;

const endTime = shallowRef(new Time(endTimeString.hour, props.editing ? endTimeString.minute : endTimeString.minute+ 10, 0))

const { $directus } = useNuxtApp();

const state = reactive({
  id: props.editing ? props.id : undefined,
  name: props.editing ? props.name :undefined,
  rooms: props.rooms,
  startTime: startTime,
  endTime: endTime
})


const schema = z.object({
    id: z.string().optional(),
    name: z.string('Name is required').max(25, 'Max 25 Characters'),
    rooms: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            }
        )
    ),
    startTime: z.object({
            hour: z.number(),
            minute: z.number()
        }),
    endTime: z.object({
            hour: z.number(),
            minute: z.number()
        }),
}).superRefine((data, ctx) => {
    const start =
      data.startTime.hour * 60 + data.startTime.minute;
    const end =
      data.endTime.hour * 60 + data.endTime.minute;

    if (end <= start) {
      ctx.addIssue({
        path: ["endTime"],
        message: "End time cannot be before start time",
        code: z.ZodIssueCode.custom,
      });
    }
    if(end > props.yLimit) {
     ctx.addIssue({
        path: ["endTime"],
        message: "End time conflicts with another session or end of Day ",
        code: z.ZodIssueCode.custom,
      });    
    }
  });

type Schema = typeof schema

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {
	try {
        const formData = submission.data as Schema;
        console.log(formData);
        if(formData.id) {
            const payload = {
                name: formData.name,
                rooms: formData.rooms.map(room => ({room : room}))
            }

            const response = await $directus.request<CongressSession>(updateItem(
                'congress_breaks', formData.id, payload
            ));

            emit("breakUpdated", true, response);
        }
        else{
            const payload = {
                name: formData.name,
                starttime: fromTimeValue(formData.startTime),
                endtime: fromTimeValue(formData.endTime),
                rooms: formData.rooms.map(room => ({room : room})),
                schedule: props.schedule,
            }

            const response = await $directus.request<CongressSession>(createItem(
                'congress_breaks', payload
            )); 

            emit("breakCreated", true, response);
        }
        
	} catch (e) {
        console.log(e);
	} 
};



</script>

<template>
  <UForm :state="state" class="space-y-4" @submit="handleSubmit($event)" :schema="schema">
    <UFormField name="id" hidden>
      <UInput hidden v-model="state.id" />
    </UFormField>
    <UFormField label="Break Name" name="name" required>
      <UInput v-model="state.name" />
    </UFormField>
    <UTooltip text="*After creation, Use Grid UI to add break to additional rooms">
        <UFormField label="Rooms" name="rooms">
                <UInputTags multiple :items="rooms" value-key="id" label-key="title" disabled class="w-50" v-model="state.rooms">
                    <template #item-text="{ item }">
                        {{ item.title }}
                    </template>
                </UInputTags>
        </UFormField>
    </UTooltip>
        <div class="flex flex-row">
            <UFormField label="Start Time" name="startTime" class="w-40" required>
                <UInputTime disabled :hour-cycle="24" :default-value="startTime"  v-model="state.startTime"/>
            </UFormField>
            <UTooltip text="*Use Grid UI to update times">
                <UFormField label="End Time" name="endTime" class=" w-40" required>
                    <UInputTime :disabled="props.editing" :hour-cycle="24" :default-value="endTime" v-model="state.endTime"/>
                </UFormField>
           </UTooltip>
    </div>
    <UButton type="submit" color="accent" variant="solid" :label="editing ? 'Update Break' : 'Create Break'">
    </UButton>
  </UForm>
</template>

