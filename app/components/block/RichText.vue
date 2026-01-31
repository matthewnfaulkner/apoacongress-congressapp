<script setup lang="ts">
import Text from '~/components/base/Text.vue';
import { useDirectusTranslation } from '~/composables/useDirectusTranslation'
import type { BlockRichtextTranslation } from '~~/shared/types/schema';

const { locale } = useI18n();

interface RichTextProps {
	data: {
		id?: string;
		tagline?: string;
		headline?: string;
		content?: string;
		alignment?: 'left' | 'center' | 'right';
		className?: string;
		translations?: BlockRichtextTranslation[]
	};
}

const props = withDefaults(defineProps<RichTextProps>(), {
	data: () => ({
		alignment: 'left',
	}),
});


const { translated } = useDirectusTranslation(props?.data?.translations)

const { setAttr } = useVisualEditing();
</script>

<template>
	<div
		:class="[
			'mx-auto  space-y-6',
			{
				'text-center': data.alignment === 'center',
				'text-right': data.alignment === 'right',
				'text-left': data.alignment === 'left',
			},
			data.className,
		]"
	>
		<Tagline
			v-if="data.tagline"
			:tagline="translated?.tagline || data.tagline"
			:data-directus="
				setAttr({
					collection: 'block_richtext',
					item: data.id,
					fields: 'tagline',
					mode: 'popover',
				})
			"
		/>
		<Headline
			v-if="data.headline"
			:headline="translated?.headline || data.headline"
			:data-directus="
				setAttr({
					collection: 'block_richtext',
					item: data.id,
					fields: 'headline',
					mode: 'popover',
				})
			"
		/>
		<Text
			v-if="data.content"
			:content="translated?.content ||data.content"
			:data-directus="
				setAttr({
					collection: 'block_richtext',
					item: data.id,
					fields: 'content',
					mode: 'drawer',
				})
			"
		/>
	</div>
</template>
