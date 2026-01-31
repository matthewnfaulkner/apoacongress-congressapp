<script setup lang="ts">

const { locale } = useI18n();

interface WorkshopsProps {
	data: Workshop
}

const props = defineProps<WorkshopsProps>();

</script>

<template>
	<div>
		{{ data.price }}
	</div>
</template>
