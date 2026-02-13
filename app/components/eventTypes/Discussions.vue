<script setup lang="ts">

const { locale } = useI18n();

interface DiscussionsProps {
	data: Discussion
}

const props = defineProps<DiscussionsProps>();

</script>

<template>
	<div>
		Discussion
	</div>
</template>
