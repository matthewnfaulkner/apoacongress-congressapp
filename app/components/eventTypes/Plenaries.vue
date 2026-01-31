<script setup lang="ts">

const { locale } = useI18n();

interface PlenariesProps {
	data: Plenary
}

const props = defineProps<PlenariesProps>();

</script>

<template>
	<div>
		{{ data.topic }}
	</div>
</template>
