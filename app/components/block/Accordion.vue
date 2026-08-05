<script setup lang="ts">


interface AccordionItem {
    id: string;
    label: string;
    icon: string;
    content: string;
}

interface AccordionProps {
	data: {
		id: string;
		tagline: string;
		headline: string;
        items: AccordionItem[]
	};
}

const { setAttr } = useVisualEditing();
const props = defineProps<AccordionProps>();


</script>


<template>
    <Tagline :tagline="data.tagline" />
	<Headline :headline="data.headline" class="pt-5"/>

    <UAccordion type="multiple" :items="data.items"
        class="w-200 m-auto"
        :ui="{
            content: 'h-fit',
            label: 'text-xl',
            item: 'rounded  px-5'
        }">
        <template #leading="{item}">
            <UIcon 
                v-if="item.icon" 
                :name="`i-material-symbols-${item.icon}`"
                class="text-[1.5rem] text-accent" 
            />
        </template>
        <template #content="{item}">
            <div v-html="item.content" class="p-10"/>
        </template>
    </UAccordion>
</template>
