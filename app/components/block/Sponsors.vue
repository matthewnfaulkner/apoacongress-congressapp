<script setup lang="ts">
import Text from '~/components/base/Text.vue';

const { locale } = useI18n();

interface RichTextProps {
	data: {
		id?: string
		tagline?: string
		headline?: string
        description?: string
        include_tiers?: boolean,
        sponsors: [
            {
                sponsor: {
                    id: string,
                    sponsor: Organisation,
                    tier: {
                        id: string
                        name?: string,
                        color?: string
                        sort: number,
                    }
                }
            }
        ]

	};
}

type Sponsor = {
    sponsor: {
        id: string,
        sponsor: {
            id: string
            name?: string,
            logo?: DirectusFile | string | null
            description?: string
            website?: string
        },
        tier: {
            id: string
            name?: string,
            color?: string
            sort: number,
        }
    }
}

type TierGroup = {
  tierId: string;
  name?: string;
  color?: string;
  sort: number;
  sponsors: Sponsor[];
};

const props = defineProps<RichTextProps>();


const sponsorsByTier = computed(() => {
    if (!props.data?.sponsors?.length) return [];
    return [...props.data.sponsors].sort((a, b) => (a.sponsor?.tier?.sort ?? 0) - (b.sponsor?.tier?.sort ?? 0));
})

const groupedByTier = computed(() => Object.values(
  sponsorsByTier.value.reduce<Record<string, TierGroup>>((acc, sponsor) => {
    const  tier  = sponsor.sponsor.tier;

    if (!acc[tier.id]) {
      acc[tier.id] = {
        tierId: tier.id,
        name: tier.name,
        color: tier.color,
        sort: tier.sort,
        sponsors: [],
      };
    }

    acc[tier.id].sponsors.push(sponsor);

    return acc;
  }, {})
).sort((a, b) => a.sort - b.sort)
)

const { setAttr } = useVisualEditing();
</script>

<template>
	<div>
		<Tagline
			v-if="data.tagline"
			:tagline="data.tagline"
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
			:headline="data.headline"
			:data-directus="
				setAttr({
					collection: 'block_richtext',
					item: data.id,
					fields: 'headline',
					mode: 'popover',
				})
			"
		/>

        <UPageSection :ui="{
            container: 'gap-0 sm:gap-0 lg:gap-0 lg:py-0'
        }">
            <div v-if="data.sponsors" v-for="(tier, index) in groupedByTier" class="pb-15">
                <USeparator     
                    :label="tier.name" 
                    size="xl"
                    :style="{ '--tier-color': tier.color }"
                    :ui="{
                        border: `border border-[var(--tier-color)]`,
                    }" >
                    <template #default>
                        <Headline :headline="tier.name"/>
                    </template>
                    </USeparator>
                <UPageGrid
                    class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8"
                    :class="{
                            'lg:grid-cols-2': index === 0,
                            'lg:grid-cols-4': index === 1 || index >= 4,
                        }">
                    <UPageCard
                        v-for="sponsor in tier.sponsors"
                        :key="sponsor.sponsor.id"
                        highlight-color="accent"
                        orientation="vertical"
                        class="text-center h-full justify-center ring-0"
                        :ui="{
                            wrapper: 'items-center'
                        }"
                    >
                        <template #header>
                            <Tagline
                                class="text-xs w-full"
                                :tagline="sponsor.sponsor.sponsor.name"
                            />
                            <Text
                                class="text-xl font-heading"
                                :content="sponsor.sponsor.sponsor.description as string"
                            />
                            <Text
                                class="text-xl font-heading"
                                :content="sponsor.sponsor.tier.name as string"
                            />
                        </template>

                        <template #body>
                            <DirectusImage
                                v-if="sponsor.sponsor.sponsor.logo"
                                class="h-50"
                                :uuid="sponsor.sponsor.sponsor.logo"
                            />
                        </template>
                    </UPageCard>
                </UPageGrid>

            </div>
        </UPageSection>
	</div>
</template>
