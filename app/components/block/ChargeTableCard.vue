<script setup lang="ts">
import { type BlockChargeTableCard, type AccommodationChargeDetail, type CongressCharge, type RegistrationChargeDetail } from '~~/shared/types/schema';
import Button from '../base/BaseButton.vue';
import { CheckCircle2 } from 'lucide-vue-next';

interface ChargeCardProps {
	card: {
		id: string;
		title: string;
		description?: string;
		category: 'registration' | 'accommodation';
		congress_charges?: Array<{
			congress_charge: CongressCharge
		}>;
		badge?: { 
				id: string;
				label: string | null;
				variant: string | null;
				url: string | null;
				type: 'url' | 'page' | 'post';
				pagePermalink?: string | null;
				postSlug?: string | null;
			};
		button: { 
				id: string;
				label: string | null;
				variant: string | null;
				url: string | null;
				type: 'url' | 'page' | 'post';
				pagePermalink?: string | null;
				postSlug?: string | null;
			};
		is_highlighted?: boolean;
	};
}

interface Feature {
	price: string,
	details: RegistrationChargeDetail[] | AccommodationChargeDetail[] | string[];
}

interface ChargeCard  {
	id: string,
	category?: 'registration' | 'accommodation';
	title?: string;
	headline?: string;
	description?: string;
	is_highlighted?: boolean;
	features?: Feature[];
	badge?: { 
				id: string;
				label: string | null;
				variant: string | null;
				url: string | null;
				type: 'url' | 'page' | 'post';
				pagePermalink?: string | null;
				postSlug?: string | null;
			};
	button?: { 
				id: string;
				label: string | null;
				variant: string | null;
				url: string | null;
				type: 'url' | 'page' | 'post';
				pagePermalink?: string | null;
				postSlug?: string | null;
			};
}


const { setAttr } = useVisualEditing();
const now = new Date();

const props = defineProps<ChargeCardProps>();

const card = ref<ChargeCard>({});
const topCharge = ref<CongressCharge>();

// charges is now reactive
const charges = computed(() =>
  props.card.congress_charges?.slice() ?? []
);

watchEffect(() => {
  const localCharges = [...charges.value]; // mutable copy

  if (props.card.category === 'accommodation') {

    const top = localCharges.shift();
    topCharge.value = top;

    const details =
      top?.congress_charge.details as AccommodationChargeDetail[];

    const detail = details?.[0];

    card.value = {
      id: props.card.id,
      category: 'accommodation',
      headline: detail?.stay_length || '',
      description: `${dateStringToHumanStringBack(detail?.check_in)} - ${dateStringToHumanStringBack(detail?.check_out)}`,
      title: '',
      badge: props.card.badge,
      button: props.card.button,
      features: localCharges.flatMap(c => ({
        price: c.congress_charge.price,
        details: c.congress_charge.sub_category
      }))
    };

  } else if (props.card.category === 'registration') {

    const filteredCharges = localCharges.filter(charge => {
      const details =
        charge.congress_charge.details[0] as RegistrationChargeDetail;

      const cutoff = new Date(details.cutoff_date);
      return now < cutoff;
    });

    const top = filteredCharges.shift();
    topCharge.value = top;

    const details =
      top?.congress_charge.details as RegistrationChargeDetail[];

    const detail = details?.[0];

    card.value = {
      id: props.card.id,
      category: 'registration',
      title: top?.congress_charge.sub_category || '',
      headline: top?.congress_charge.price || '',
      description: `${detail?.cutoff_description || ''} ${dateStringToHumanStringBack(detail?.cutoff_date)}`,
      badge: props.card.badge,
      button: props.card.button,
      features: filteredCharges.flatMap(c => ({
        price: c.congress_charge.price,
        details: c.congress_charge.details
      }))
    };
  }
});


</script>

<template>
	<div 
		:data-directus="
					setAttr({ collection: 'block_chargetable_cards', item: card.id, mode: 'popover' })
				"
		:class="[
			'flex flex-col max-w-[600px] border rounded-lg p-6',
			card.is_highlighted ? 'border-accent' : 'border-input',
		]"
	>
		<div class="flex justify-between items-start gap-2 mb-4">
			<h3
				class="text-2xl font-heading text-foreground"
				
			>
				{{ card.title }}
			</h3>
			<div class="flex-shrink-0">
				<BaseButton
					v-if="card.badge"
					v-bind="card.badge"
					class="w-full text-sm hover:text-secondary hover:border-secondary"
					id="card.button.uuid"
					color="neutral"
					:data-directus="
						setAttr({
							collection: 'block_button',
							item: card.badge.id,
							fields: ['type', 'label', 'variant', 'url', 'page', 'post'],
							mode: 'popover',
						})
					"
				/>
			</div>
		</div>

		<p
			v-if="card.headline"
			class="text-h2 text-4xl text-accent mt-2 font-semibold"		>
			{{ card.headline }}
		</p>

		<p
			v-if="card.description"
			class="text-description mt-2 line-clamp-2"
		>
			{{ card.description }}
		</p>

		<hr class="my-4" />

		<div class="flex-grow">
			<ul
				v-if="card.features"
				class="space-y-4"
			>
				<li v-for="(feature, index) in card.features" :key="index" class="flex items-center gap-3 text-regular">
					<p v-if="card.category == 'registration'" v-for="details in feature.details as RegistrationChargeDetail[]" class="leading-relaxed">
						{{details?.cutoff_description}}{{ dateStringToHumanStringBack(details?.cutoff_date) }} - {{ feature.price }}
					</p>
					<p v-else-if="card.category == 'accommodation'" class="leading-relaxed">
						{{ feature.details }} - <b> {{ feature.price }} </b>
					</p>
				</li>
			</ul>
		</div>

		<div class="mt-auto pt-4">
			<BaseButton
				v-if="card.button"
				v-bind="card.button"
				class="w-full"
				id="card.button.uuid"
				:data-directus="
					setAttr({
						collection: 'block_button',
						item: card.button.id,
						fields: ['type', 'label', 'variant', 'url', 'page', 'post'],
						mode: 'popover',
					})
				"
				:label="card.button.label"
				:variant="card.button.variant"
			/>
		</div>
	</div>
</template>
