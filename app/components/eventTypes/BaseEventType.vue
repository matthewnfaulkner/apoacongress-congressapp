<script setup lang="ts">

import Symposiums from './Symposiums.vue';
import Plenaries from './Plenaries.vue';
import Talks from './Talks.vue';
import Workshops from './Workshops.vue';
import Discussions from './Discussions.vue';

interface BaseEventTypeProps {
	type: {
		collection: string;
		item: any;
		id: string;
	};
}

const props = defineProps<BaseEventTypeProps>();

const typeRef = ref<HTMLElement | null>(null);

const components: Record<string, any> = {
    symposiums: Symposiums,
    plenaries: Plenaries,
    talks: Talks,
    workshops: Workshops,
	discussions: Discussions
};

const Component = computed(() => components[props.type.collection] || null);
const componentData = computed(() => props.type.item);
</script>

<template>
	<div ref="typeRef" class="text-wrap">
		<component :is="Component" v-if="Component" :id="`eventType-${type.id}`" :data="componentData" />
	</div>
</template>
