<script setup lang="ts">
import Text from '~/components/base/Text.vue';
import { useDirectusTranslation } from '~/composables/useDirectusTranslation'
import type { BlockRichtextTranslation, Symposium } from '~~/shared/types/schema';

const { locale } = useI18n();

interface SymposiumsProps {
	data: Symposium
}

const props = defineProps<SymposiumsProps>();

</script>

<template>
	<div>
		{{ data?.topic }}
	</div>
</template>
