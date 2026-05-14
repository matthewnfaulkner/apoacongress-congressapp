<script setup lang="ts">

const toFlagEmoji = (code: string) =>
	code.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')

interface PersonProfileCardUi {
	// UPageCard internal slots
	wrapper?: string;
	container?: string;
	header?: string;
	body?: string;
	footer?: string;
	// Visual elements
	badgeWrapper?: string;
	badge?: string;
	image?: string;
	name?: string;
	title?: string;
	flag?: string;
	extratitle?: string;
	extratopic?: string;
}

interface PersonProfileCardProps {
	id: string;
	firstName?: string | null;
	lastName?: string | null;
	title?: string | null;
	image?: any;
	country?: { countryCodes: string[]; locale: string } | null;
	badge?: string | null;
	showTitle?: boolean;
	showFlag?: boolean;
	showCountry?: boolean;
	extratitle?: string | null;
	extratopic?: string | null;
	imageClass?: string;
	cardClass?: string;
	highlightColor?: 'accent' | 'primary' | 'secondary' | 'tertiary' | 'info' | 'success' | 'warning' | 'error' | 'neutral';
	ui?: PersonProfileCardUi;
}

const props = defineProps<PersonProfileCardProps>();
</script>

<template>
	<UPageCard
		class="text-center ring-0 bg-transparent"
		:class="cardClass"
		:to="`/people/${id}`"
		orientation="vertical"
		:highlight-color="highlightColor"
		:ui="{
			wrapper: ui?.wrapper ?? 'mx-auto',
			container: ui?.container ?? 'gap-y-0',
			body: ui?.body,
			footer: ui?.footer,
			header: ui?.header,
		}"
	>
		<template v-if="badge" #header>
			<div :class="ui?.badgeWrapper">
				<UBadge
					:label="badge"
					color="accent"
					:class="ui?.badge ?? 'text-sm mx-auto'"
					:ui="{ label: 'whitespace-normal' }"
				/>
			</div>
		</template>

		<template #body>
			<div class="relative inline-block mx-auto">
				<ProfileImage
					class="bg-transparent"
					:class="[imageClass ?? 'h-40', ui?.image]"
					:image="image"
				/>
				<span
					v-if="showFlag && country?.countryCodes?.[0]"
					:class="['bg-transparent absolute bottom-0 right-0 inline-flex items-center justify-center w-8 h-8 rounded-full  text-lg leading-none', ui?.flag]"
					style="font-size: 40px;"
				>{{ toFlagEmoji(country.countryCodes[0]) }}</span>
			</div>
		</template>

		<template #footer>
			<p :class="['font-heading text-xl', ui?.name]"><span v-if="showTitle && title" :class="['font-heading', ui?.title]">
				{{ title }}.
			</span> {{ firstName }} {{ lastName }}</p>
			<div v-if="showCountry && country" class="flex items-center justify-center gap-1 mt-1 font-heading text-secondary">
				<CountryName
					:country-codes="country.countryCodes"
					:locale="country.locale"
				/>
			</div>
			<div v-if="extratitle" :class="['text-accent', ui?.extratitle]">{{ extratitle }}</div>
			<div v-if="extratopic" :class="['font-bold', ui?.extratopic]">{{ extratopic }}</div>
		</template>
	</UPageCard>
</template>
