<script setup lang="ts">
import ButtonGroup from '../base/ButtonGroup.vue';

import { CheckCircle2 } from 'lucide-vue-next';

interface PricingCardProps {
	card: PricingCard
}

interface PricingCard {
		id: string;
		use_congress_charges?: boolean;
		title: string;
		description?: string;
		price?: string;
		badge?: Array<{label: string, link?: string}> | null;
		features?: string[] | Feature[];
		category?: 'registration' | 'accommodation';
		congress_charges?: Array<{
			charge: CongressCharge
		}>
		button_group?: {
			id?: string;
			buttons: Array<{
				id: string;
				label: string | null;
				variant: string | null;
				url: string | null;
				type: 'url' | 'page' | 'post';
				pagePermalink?: string | null;
				postSlug?: string | null;
			}>;
		};
		is_highlighted?: boolean;
		hotel?: { id: string; name: string; star_rating?: number | null } | null;
};

interface Feature {
	price: string,
	details: RegistrationChargeDetail[] | AccommodationChargeDetail[] | string[];
}

const { setAttr } = useVisualEditing();

const props = defineProps<PricingCardProps>();

const card = ref<PricingCard>(props.card);

watchEffect(() => {
	if(!card.value.use_congress_charges) return;

	const topCharge = ref<CongressCharge>();

	// charges is now reactive
	const charges = computed(() =>
		props.card.congress_charges?.slice() ?? []
	);

	const now = new Date();

	const localCharges = [...charges.value]; // mutable copy
	console.log(localCharges);
	if (props.card.category === 'accommodation') {

		const top = localCharges.shift();
		topCharge.value = top?.charge;

		const details = top?.charge.details as AccommodationChargeDetail[];

		const detail = details?.[0];

		const rawHotel = top?.charge.hotel;
		const hotel = rawHotel && typeof rawHotel === 'object' ? rawHotel as { id: string; name: string; star_rating?: number | null } : null;

		card.value = {
			id: props.card.id,
			category: 'accommodation',
			title: props.card.title ? props.card.title : top?.charge.sub_category || '',
			price: top?.charge.price || '',
			description: `${dateStringToHumanStringBack(detail?.check_in)} - ${dateStringToHumanStringBack(detail?.check_out)}`,
			badge: props.card.badge,
			button_group: props.card.button_group,
			use_congress_charges: true,
			is_highlighted: props.card.is_highlighted,
			hotel,
			features: localCharges.flatMap(c => {
				return `${c.charge.price} - ${c.charge.sub_category}`;
			})
		};

	} else if (props.card.category === 'registration') {

		const filteredCharges = localCharges.filter(charge => {
			if(!charge.charge.details || Object.keys(charge.charge.details ).length) return true

			const details =
				charge.charge.details[0] as RegistrationChargeDetail;

			console.log(details)
			const cutoff = new Date(details.cutoff_date);
			return now < cutoff;
			

			return true;
		});
		console.log(filteredCharges);
		const top = filteredCharges.shift();
		topCharge.value = top?.charge;

		const details =
		top?.charge.details as RegistrationChargeDetail[];

		const detail = details?.[0] as RegistrationChargeDetail;

		card.value = {
			id: props.card.id,
			category: 'registration',
			title: props.card.title ? props.card.title : top?.charge.sub_category || '',
			price: top?.charge.price || '',
			badge: props.card.badge,
			button_group: props.card.button_group,
			use_congress_charges: true,
			is_highlighted: props.card.is_highlighted,

		};
	}
});

</script>

<template>
	<div
		:class="[
			'flex flex-col max-w-[600px] border rounded-lg p-6',
			card.is_highlighted ? 'border-accent' : 'border-input',
		]"
	>
		<div class="flex justify-between items-start gap-2 mb-4">
			<h3
				class="text-2xl font-heading text-foreground"
				:data-directus="
					card.use_congress_charges
						? setAttr({
							collection: 'block_pricing_cards',
							item: card.id,
							fields: ['congress_charges'],
							mode: 'popover'
						}) :
					setAttr({ collection: 'block_pricing_cards', item: card.id, fields: ['title'], mode: 'popover' })
				"
			>
				{{ card.title }}
			</h3>
			<div class=""
				v-if="card.badge"
				v-for="badge in card.badge">
				<UButton v-if="badge.link"
				:variant="card.is_highlighted ? 'solid' : 'outline'"
					color= "secondary"
					class="text-xs font-medium uppercase"
					:to="badge.link"
					:data-directus="
						
						setAttr({
							collection: 'block_pricing_cards',
							item: card.id,
							fields: ['badge'],
							mode: 'popover',
						})
					"
				>
					{{ badge.label}}
					
				</UButton>
				<UBadge
					v-else
					:variant="card.is_highlighted ? 'solid' : 'outline'"
					color= "secondary"
					class="text-xs font-medium uppercase "
					:data-directus="
						setAttr({
							collection: 'block_pricing_cards',
							item: card.id,
							fields: ['badge'],
							mode: 'popover',
						})
					"
				>
					{{ badge.label}}
				</UBadge>
			</div>
		</div>
		<p
			v-if="card.price"
			class="text-h2 text-4xl text-accent mt-2 font-semibold"
			:data-directus="
				card.use_congress_charges
					? setAttr({
						collection: 'block_pricing_cards',
						item: card.id,
						fields: ['congress_charges'],
						mode: 'popover'
					})
					: setAttr({
						collection: 'block_pricing_cards',
						item: card.id,
						fields: ['price'],
						mode: 'popover'
					})
				"
		>
			{{ card.price }}
		</p>

		<p
			v-if="card.description"
			class="text-description mt-2 line-clamp-2"
			:data-directus="
				setAttr({ collection: 'block_pricing_cards', item: card.id, fields: ['description'], mode: 'popover' })
			"
		>
			{{ card.description }}
		</p>

		<hr class="my-4" />

		<div class="flex-grow">
			<ul
				v-if="card.features"
				class="space-y-4 list-disc"
				:data-directus="
					card.use_congress_charges
					? setAttr({
						collection: 'block_pricing_cards',
						item: card.id,
						fields: ['congress_charges'],
						mode: 'popover'
					}) :
					setAttr({ collection: 'block_pricing_cards', item: card.id, fields: ['features'], mode: 'popover' })
				"
			>
				<li v-for="(feature, index) in card.features" :key="index" class="flex items-center gap-3 text-regular">
					
					<p class="leading-relaxed" v-html="feature"></p>
				</li>
			</ul>
		</div>
		<UButton
			v-if="card.hotel"
			:to="`/hotels/${card.hotel.id}`"
			variant="ghost"
			color="accent"
			class="mt-4 w-full justify-center text-sm"
			icon="i-lucide-building-2"
			trailing
		>
			{{ card.hotel.name }}
		</UButton>
		<div
			v-if="card.button_group?.buttons?.length"
			class="mt-6 flex justify-center image_left my-3"
		>
			<ButtonGroup
				:buttons="card.button_group?.buttons"
				:data-directus="
					setAttr({ 
						collection: 'block_button_group', 
						item: card.button_group?.id ?? null,
						fields: 'buttons', 
						mode: 'modal' })
				"
			/>
		</div>
	</div>
</template>
