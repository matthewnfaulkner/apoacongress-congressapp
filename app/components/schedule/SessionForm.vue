<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { createItem, readItems, deleteItem, updateItem } from '@directus/sdk';
import { Time } from '@internationalized/date'
import { toTimeValue } from '@/utils/time-utils';
import * as z from 'zod'

type Mode = 'create' | 'update';

const props = defineProps<{
    mode: Mode,
    room: string,
    timeSubDivision: number,
    startTime: string,
    endTime?: string,
    schedule: string,
    yLimit: number,
    editing: boolean
    session?: CongressSession;

}>()

const emit = defineEmits<{ 
        sessionCreated: [boolean,CongressSession?,ApoaSection?],
        sessionUpdated: [boolean,CongressSession?,ApoaSection?],
    }>()

const startTimeString = toTimeValue(props.startTime);
const startTime = shallowRef(new Time(startTimeString.hour, startTimeString.minute, 0))

const endTimeString = props.editing ? toTimeValue(props?.endTime) : startTimeString;

const endTime = shallowRef(new Time(endTimeString.hour, props.editing ? endTimeString.minute : endTimeString.minute+ 10, 0))

const { $directus } = useNuxtApp();

const { data } = await useAsyncData <ApoaSection[]>('abstracts', async() => {
    return await $directus.request<ApoaSection[]>(readItems('apoa_sections'));
})

const sections = ref<ApoaSection[]>([]);

if(data.value) {
    sections.value = data.value.map(section => ({label: section.name, value: {id: section.id, color: section.color, name: section.name}}))
}


const section = sections.value?.find(section => section.value.id == props.session?.section || section.value.id == props.session?.section?.id)



const state = reactive({
  id: props.editing ? props.session?.id : undefined,
  title: props.editing ? props.session?.title :undefined,
  section: props.editing ? section.value : undefined,
  startTime: startTime,
  endTime: endTime
})


const schema = z.object({
    id: z.any().nullable(),
    title: z.string('Title is required').max(250, 'Max 25 Characters'),
    section: z.object({
        id: z.string('Section is required'),
        color: z.string('Section is required'),
        name: z.string(),
    }),
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
        if(formData.id) {
            const payload = {
                title: formData.title,
                section: formData.section.id,
            }

            const response = await $directus.request<CongressSession>(updateItem(
                'congress_sessions', formData.id, payload
            ));

            emit("sessionUpdated", true, response, formData.section);
        }
        else{
            const payload = {
                title: formData.title,
                section: formData.section.id,
                starttime: fromTimeValue(formData.startTime),
                endtime: fromTimeValue(formData.endTime),
                room: props.room,
                schedule: props.schedule,
            }

            const response = await $directus.request<CongressSession>(createItem(
                'congress_sessions', payload
            )); 

            emit("sessionCreated", true, response, formData.section);
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
    <UFormField label="Session Title" name="title" required>
      <UInput v-model="state.title" />
    </UFormField>
    <UFormField label="Session Section" name="section">
            <USelect :items="sections" placeholder="Section"  class="w-50" v-model="state.section"></USelect>
    </UFormField>
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
    <UButton type="submit" color="accent" variant="solid" :label="editing ? 'Update Session' : 'Create Session'">
    </UButton>
  </UForm>
</template>

