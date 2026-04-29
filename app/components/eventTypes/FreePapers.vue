<script setup lang="ts">

import type {  FreePapers } from '~~/shared/types/schema';

const { locale } = useI18n();

interface FreePaperssProps {
	data: FreePapers
}

const props = defineProps<FreePaperssProps>();

</script>

<template>
	<div>
		{{ data?.topic }}
	</div>
</template>
