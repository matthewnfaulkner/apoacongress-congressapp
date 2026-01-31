<script setup lang="ts">
const { locale } = useI18n();

interface TalksProps {
	data: Talk
}

const props = defineProps<TalksProps>();

</script>

<template>
	<div>
		{{ data.topic }}
	</div>
</template>
