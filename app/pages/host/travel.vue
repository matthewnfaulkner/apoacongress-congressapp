<script setup lang="ts">
import { readMe } from '@directus/sdk';
import type { VenueVisaInfo, CountryTravelInfo, Site } from '#shared/types/schema';

const travelPageUrl = useRequestURL();
useSeoMeta({
	title: 'Travel & Visa Information',
	description: 'Visa requirements, travel information and entry guidance for APOA 2026 Taiwan.',
	ogTitle: 'Travel & Visa Information',
	ogDescription: 'Visa requirements, travel information and entry guidance for APOA 2026 Taiwan.',
	ogUrl: travelPageUrl.toString(),
});

const { $directus } = useNuxtApp();
const auth = useAuthStore();
const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.getSiteData() as any;
const venueId = siteData?.congress?.[0]?.venue?.id as string | undefined;

const isLoggedIn = computed(() => auth.isAuthenticated !== false);

// Country selector state
const selectedCountryCode = ref<string | undefined>(undefined);

type CountryItem = { name: string; code: string; emoji: string };

const { data: countries, status, execute } = await useLazyFetch<{
  name: string
  code: string
  emoji: string
}[]>('/api/countries.json', {
  immediate: false
})

execute();

// Fetch all travel data
const { data: travelData, error } = await useFetch<{
	travelGeneralInfo: string | null;
	visaInfo: VenueVisaInfo[];
	travelInfo: CountryTravelInfo[];
}>('/api/travel', {
	query: { venueId },
	key: `travel:${venueId}`,
	getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
});



// Pre-populate country from the logged-in user's profile
onMounted(async () => {
	if (!isLoggedIn.value) return;
	try {
		const me = await $directus.request(readMe({ fields: ['country'] as any }));
		const raw = (me as any)?.country;
		if (!raw) return;
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
		const code = (parsed?.countryCodes?.[0] ?? '').toUpperCase();
		if (code) selectedCountryCode.value = code;
	} catch {
		// silently ignore — country pre-population is best-effort
	}
});

// Visa info: show entries that are general (no countries set) OR include the selected country
const filteredVisaInfo = computed<VenueVisaInfo[]>(() => {
	if (!travelData.value?.visaInfo?.length) return [];
	const code = selectedCountryCode.value;

	return travelData.value.visaInfo.filter((info) => {
		const countries = info.countries as Array<{ id: number; country: string | null } | string> | null | undefined;
		if (!countries || countries.length === 0) return true; // general info — show always
		if (!code) return true; // no country selected — show all
		return countries.some((c) => {
			const key = typeof c === 'string' ? c : c.country;
			if (!key) return false;
			return key.toUpperCase() === code;
		});
	});
});

// Country-specific travel info matching the selected country
const countryTravelInfo = computed<CountryTravelInfo | null>(() => {
	if (!travelData.value?.travelInfo?.length || !selectedCountryCode.value) return null;
	const code = selectedCountryCode.value;

	return (
		travelData.value.travelInfo.find((info) => {
			const country = info.country as | string | null | undefined;
			if (!country) return false;
			return country.toUpperCase() === code;
		}) ?? null
	);
});

const selectedCountryName = computed(() => {
	if (!selectedCountryCode.value) return null;
	try {
		return new Intl.DisplayNames(['en'], { type: 'region' }).of(selectedCountryCode.value);
	} catch {
		return selectedCountryCode.value;
	}
});

const highlightCountry = (html: string | null | undefined): string => {
	if (!html || !selectedCountryName.value) return html ?? '';
	const escaped = selectedCountryName.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// Only match in text nodes — the negative lookahead skips text inside < >
	return html.replace(new RegExp(`(${escaped})(?![^<]*>)`, 'gi'), '<strong class="bg-yellow-200">$1</strong>');
};

// ── Flight search ────────────────────────────────────────────────────────────

const toISODate = (d: Date) => d.toISOString().split('T')[0];

const departureDate = computed(() => {
	const start = siteData?.congress?.[0]?.startdate as string | null;
	if (!start) return null;
	const d = new Date(start);
	d.setDate(d.getDate() - 1);
	return toISODate(d);
});

const returnDate = computed(() => {
	const end = siteData?.congress?.[0]?.enddate as string | null;
	if (!end) return null;
	const d = new Date(end);
	d.setDate(d.getDate() + 1);
	return toISODate(d);
});

// ── Offer parsing helpers ────────────────────────────────────────────────────

const parseDuration = (iso: string) => {
	const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
	return m ? `${m[1] ?? 0}h ${m[2] ?? 0}m` : iso;
};
const fmtTime = (dt: string) => dt?.split('T')[1]?.slice(0, 5) ?? '';
const fmtDate = (dt: string) =>
	new Date(dt).toLocaleDateString('en', { day: 'numeric', month: 'short' });

const parseSegment = (seg: any) => ({
	flightNumber: `${seg.marketing_carrier?.iata_code ?? ''}${seg.marketing_carrier_flight_number ?? ''}`,
	airline: seg.marketing_carrier?.name ?? '',
	airlineLogo: seg.marketing_carrier?.logo_symbol_url ?? '',
	origin: seg.origin?.iata_code ?? '',
	originName: seg.origin?.name ?? seg.origin?.city_name ?? '',
	destination: seg.destination?.iata_code ?? '',
	destinationName: seg.destination?.name ?? seg.destination?.city_name ?? '',
	departingAt: seg.departing_at ?? '',
	arrivingAt: seg.arriving_at ?? '',
	duration: parseDuration(seg.duration ?? ''),
	stops: seg.stops?.length ?? 0,
});

const parseSlice = (slice: any) => {
	const segs = slice?.segments ?? [];
	const first = segs[0];
	const last = segs[segs.length - 1];
	const pax = first?.passengers?.[0];
	return {
		originCode: slice.origin?.iata_code ?? slice.origin?.iata_city_code ?? '',
		originCity: slice.origin?.city_name ?? slice.origin?.name ?? '',
		destinationCode: slice.destination?.iata_code ?? slice.destination?.iata_city_code ?? '',
		destinationCity: slice.destination?.city_name ?? slice.destination?.name ?? '',
		departingAt: first?.departing_at ?? '',
		arrivingAt: last?.arriving_at ?? '',
		duration: parseDuration(slice.duration ?? ''),
		connections: segs.length - 1,
		fareBrand: slice.fare_brand_name ?? '',
		segments: segs.map(parseSegment),
		baggages: {
			checked: pax?.baggages?.find((b: any) => b.type === 'checked')?.quantity ?? 0,
			carryOn: pax?.baggages?.find((b: any) => b.type === 'carry_on')?.quantity ?? 0,
		},
	};
};

const parseOffer = (offer: any) => ({
	id: offer.id as string,
	price: offer.total_amount as string,
	currency: offer.total_currency as string,
	airline: {
		name: offer.owner?.name as string,
		logo: offer.owner?.logo_symbol_url as string,
		iata: offer.owner?.iata_code as string,
	},
	outbound: parseSlice(offer.slices?.[0]),
	inbound: parseSlice(offer.slices?.[1]),
	refundable: offer.conditions?.refund_before_departure?.allowed as boolean,
	refundPenalty: offer.conditions?.refund_before_departure?.penalty_amount as string | null,
	refundCurrency: offer.conditions?.refund_before_departure?.penalty_currency as string | null,
	changeable: offer.conditions?.change_before_departure?.allowed as boolean,
	expiresAt: offer.expires_at as string,
});

type ParsedOffer = ReturnType<typeof parseOffer>;

const googleFlightsUrl = (offer: ParsedOffer) => {
	const q = `Flights from ${offer.outbound.originCode} to ${offer.outbound.destinationCode} on ${departureDate.value} through ${returnDate.value}`;
	return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
};

// Step 1 — airport list from local JSON
const airportsLoading = ref(false);
const airportOptions = ref<{ label: string; value: string }[]>([]);

// Step 2 — offers for selected airport
const selectedCityCode = ref<string | undefined>(undefined);
const offersLoading = ref(false);
const cityOffers = ref<ParsedOffer[]>([]);
const flightsError = ref<string | null>(null);

// When country changes — load airports from local JSON and reset selection
watch(selectedCountryCode, async (code) => {
	airportOptions.value = [];
	selectedCityCode.value = undefined;
	cityOffers.value = [];
	flightsError.value = null;
	if (!code) return;

	airportsLoading.value = true;
	try {
		const res = await $fetch<{ data: { airportcode: string; airport: string; city: string; country: string }[] }>('/api/flights/airports', {
			query: { iata_country_code: code },
		});
		airportOptions.value = (res?.data ?? []).map((a) => ({
			label: [a.airport, a.city, a.country].filter(Boolean).join(' | '),
			value: a.airportcode,
		}));
	} catch {
		flightsError.value = 'Could not load airports for this country.';
	} finally {
		airportsLoading.value = false;
	}
});

// When city is selected — fetch offers for that city
watch(selectedCityCode, async (cityCode) => {
	cityOffers.value = [];
	flightsError.value = null;
	if (!cityCode) return;

	const destination = (travelData.value as any)?.destinationAirport as string | null;
	const date = departureDate.value;
	const rDate = returnDate.value;
	if (!destination || !date || !rDate) return;

	const daysUntilDeparture = Math.floor((new Date(date).getTime() - Date.now()) / 86_400_000);
	if (daysUntilDeparture > 3600) {
		flightsError.value = `Flight data isn't available this far in advance — check back when you're within 300 days of departure .`;
		return;
	}

	offersLoading.value = true;
	try {
		const res = await $fetch<{ data: any }>('/api/flights/offer-requests', {
			method: 'POST',
			body: { origins: [cityCode], destination, departure_date: date, return_date: rDate, return_offers: true },
		});
		const raw: any[] = res?.data?.offers ?? [];
		cityOffers.value = raw
			.map(parseOffer)
			.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
	} catch {
		flightsError.value = 'Could not load flight offers. Please try again.';
	} finally {
		offersLoading.value = false;
	}
});
</script>

<template>
	<Container class="py-12">
		<Headline headline="Travel & Visa Information" class="text-accent text-center" />
		<Tagline tagline="Everything you need to know about travelling to the congress venue." class="font-normal text-center mb-10" />

		<!-- Country Selector -->
		<div class="max-w-lg mx-auto mb-10">
			<UCard class="ring-1 ring-accent/20">
				<p class="text-sm font-medium mb-3">
					<UIcon name="i-lucide-earth" class="inline-block mr-1 text-accent" />
					Select your country for personalised travel information
					<span v-if="isLoggedIn" class="text-muted text-xs ml-1">(pre-filled from your profile)</span>
				</p>
				<USelectMenu
					v-model="selectedCountryCode"
					:items="countries ?? []"
					label-key="name"
					value-key="code"
					:search-input="{ icon: 'i-lucide-search', placeholder: 'Search countries...' }"
					placeholder="Select your country"
					class="w-full"
					size="lg"
				>
					<template #leading="{ modelValue, ui }">
						<span v-if="modelValue" class="size-5 text-center">
							{{ countries?.find((c) => c.code === modelValue)?.emoji }}
						</span>
						<UIcon v-else name="i-lucide-earth" :class="ui.leadingIcon()" />
					</template>
					<template #item-leading="{ item }">
						<span class="size-5 text-center">{{ item.emoji }}</span>
					</template>
				</USelectMenu>
				<p v-if="selectedCountryCode" class="text-xs text-muted mt-2">
					Showing information relevant to <strong>{{ selectedCountryName }}</strong>.
					<UButton
						variant="link"
						size="xs"
						color="neutral"
						label="Clear"
						class="ml-1 p-0"
						@click="selectedCountryCode = undefined"
					/>
				</p>
			</UCard>
		</div>

		<UAccordion
			type="multiple"
			:default-value="['visa', 'travel', 'flights']"
			
			:ui="{ label: 'text-4xl font-semibold', leadingIcon: 'size-5', trailingIcon: 'size-10' }"
			:items="[
				{ label: `Visa Information${selectedCountryName ? ` — ${selectedCountryName}` : ''}`, icon: 'i-lucide-stamp', slot: 'visa', value: 'visa' },
				{ label: `Travel Information${selectedCountryName ? ` — ${selectedCountryName}` : ''}`, icon: 'i-lucide-map-pin', slot: 'travel', value: 'travel' },
				{ label: 'Flights', icon: 'i-lucide-plane', slot: 'flights', value: 'flights' },
			]"
		>
			<!-- ── Visa Info ── -->
			<template #visa>
				
				<div v-if="filteredVisaInfo.length && selectedCountryCode " class="space-y-6 p-1">
					<UCard
					
						v-for="info in filteredVisaInfo"
						:key="info.id"
						class="ring-1 ring-neutral-200 dark:ring-neutral-700"
					>
						<template #header>
							<UAlert
								color="secondary"
								variant="subtle"
								icon="i-lucide-triangle-alert"
								class="mb-6"
								title="Information sourced from the host country's immigration department"
							>
								<template #description>
									The visa details below are provided as a guide only. You should verify the latest requirements directly with the immigration authority of the host country before travelling.
									<UButton
										v-if="info.link"
										:to="info.link"
										target="_blank"
										rel="noopener noreferrer"
										variant="link"
										color="accent"
										size="lg"
										icon="i-lucide-external-link"
										trailing
										label="Visit the official immigration website"
										class="mt-1 p-0"
									/>
								</template>
							</UAlert>
							<p class="text-xs text-muted">
								Last updated {{ new Date(info.date_updated ?? info.date_created ?? '').toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) }}
							</p>
						</template>
						<div
							v-if="info.details"
							class="prose prose-sm dark:prose-invert max-w-none"
							v-html="highlightCountry(info.details)"
						/>
						<template v-if="info.link" #footer>
							<UButton
								:to="info.link"
								target="_blank"
								rel="noopener noreferrer"
								variant="outline"
								color="accent"
								icon="i-lucide-external-link"
								trailing
								label="Learn more"
								size="sm"
							/>
						</template>
					</UCard>
				</div>
				<UAlert
					v-else
					color="neutral"
					variant="subtle"
					icon="i-lucide-info"
					title="No visa information available."
					description="Please select a country above or check back later."
				/>
			</template>

			<!-- ── Travel Info ── -->
			<template #travel>
				<div class="p-1">
					<UCard
						v-if="countryTravelInfo"
						class="ring-1 ring-neutral-200 dark:ring-neutral-700"
					>
						<template #header>
							<p class="text-xs text-muted">
								Last updated {{ new Date(countryTravelInfo.date_updated ?? countryTravelInfo.date_created ?? '').toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) }}
							</p>
						</template>
						<div
							v-if="countryTravelInfo.details"
							class="prose prose-sm dark:prose-invert max-w-none"
							v-html="highlightCountry(countryTravelInfo.details)"
						/>
						<template v-if="countryTravelInfo.link" #footer>
							<UButton
								:to="countryTravelInfo.link"
								target="_blank"
								rel="noopener noreferrer"
								variant="outline"
								color="accent"
								icon="i-lucide-external-link"
								trailing
								label="Learn more"
								size="sm"
							/>
						</template>
					</UCard>
					<UAlert
						v-else
						color="neutral"
						variant="subtle"
						icon="i-lucide-info"
						:title="selectedCountryCode ? `No specific travel information found for ${selectedCountryName}.` : 'Select a country to see travel information.'"
						description="Please check the visa information section or contact the congress organisers for assistance."
					/>

				<div
					v-if="travelData?.travelGeneralInfo"
					class="prose prose-sm dark:prose-invert max-w-none mt-6"
					v-html="travelData.travelGeneralInfo"
				/>
				</div>
			</template>

			<!-- ── Flights ── -->
			<template #flights>
				<div class="p-1">
					<p class="text-sm text-muted mb-6">
						Showing inbound flights on <strong>{{ departureDate }}</strong> and return flights on <strong>{{ returnDate }}</strong>.
					</p>

					<div v-if="airportsLoading" class="flex items-center gap-3 text-muted py-10 justify-center">
						<UIcon name="i-lucide-loader-circle" class="animate-spin" size="24" />
						<span>Loading airports…</span>
					</div>

					<UAlert
						v-else-if="flightsError && !selectedCityCode"
						color="error"
						variant="subtle"
						icon="i-lucide-triangle-alert"
						:title="flightsError"
						class="mb-6"
					/>

					<template v-else-if="airportOptions.length">
						<div class="max-w-lg mb-8">
							<label class="block text-sm font-medium mb-2">Select your departure airport</label>
							<USelectMenu
								v-model="selectedCityCode"
								:items="airportOptions"
								label-key="label"
								value-key="value"
								:search-input="{ placeholder: 'Search airports…' }"
								placeholder="Choose an airport"
								size="lg"
								class="w-full"
							/>
						</div>

						<div v-if="offersLoading" class="flex items-center gap-3 text-muted py-10 justify-center">
							<UIcon name="i-lucide-loader-circle" class="animate-spin" size="24" />
							<span>Searching for flights…</span>
						</div>

						<UAlert
							v-else-if="flightsError && selectedCityCode"
							color="error"
							variant="subtle"
							icon="i-lucide-triangle-alert"
							:title="flightsError"
							class="mb-6"
						/>

						<div v-else-if="cityOffers.length" class="space-y-4">
							<div class="flex items-center gap-2 mb-4">
								<UBadge color="accent" variant="subtle" size="sm">{{ cityOffers.length }} offer{{ cityOffers.length !== 1 ? 's' : '' }}</UBadge>
							</div>
							<UCard
								v-for="offer in cityOffers"
								:key="offer.id"
								class="ring-1 ring-neutral-200 dark:ring-neutral-700"
							>
								<template #header>
									<div class="flex items-center justify-between gap-4 flex-wrap">
										<div class="flex items-center gap-3">
											<img
												v-if="offer.airline.logo"
												:src="offer.airline.logo"
												:alt="offer.airline.name"
												class="h-6 w-6 object-contain"
											/>
											<span class="font-semibold">{{ offer.airline.name }}</span>
											<UBadge v-if="offer.outbound.fareBrand" color="neutral" variant="subtle" size="xs">
												{{ offer.outbound.fareBrand }}
											</UBadge>
										</div>
										<span class="text-xl font-bold text-accent">
											{{ offer.currency }} {{ parseFloat(offer.price).toLocaleString('en', { minimumFractionDigits: 2 }) }}
										</span>
									</div>
								</template>

								<div class="space-y-4 text-sm">
									<div v-for="(leg, i) in [offer.outbound, offer.inbound]" :key="i" class="flex items-start gap-3">
										<UIcon
											:name="i === 0 ? 'i-lucide-plane-takeoff' : 'i-lucide-plane-landing'"
											class="mt-0.5 shrink-0 text-accent"
										/>
										<div class="flex-1 min-w-0">
											<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
												<span class="font-semibold">{{ leg.originCode }}</span>
												<span class="text-muted text-xs">{{ leg.originCity }}</span>
												<UIcon name="i-lucide-arrow-right" class="text-muted" size="14" />
												<span class="font-semibold">{{ leg.destinationCode }}</span>
												<span class="text-muted text-xs">{{ leg.destinationCity }}</span>
											</div>
											<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-muted text-xs">
												<span>{{ fmtDate(leg.departingAt) }} {{ fmtTime(leg.departingAt) }} → {{ fmtTime(leg.arrivingAt) }}</span>
												<span>{{ leg.duration }}</span>
												<span>{{ leg.connections === 0 ? 'Direct' : `${leg.connections} stop${leg.connections > 1 ? 's' : ''}` }}</span>
											</div>
										</div>
									</div>
								</div>

								<template #footer>
									<div class="flex items-center justify-between gap-4 flex-wrap">
										<div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
											<span v-if="offer.outbound.baggages.checked">
												<UIcon name="i-lucide-briefcase" class="inline mr-1" />{{ offer.outbound.baggages.checked }}× checked
											</span>
											<span v-if="offer.outbound.baggages.carryOn">
												<UIcon name="i-lucide-backpack" class="inline mr-1" />{{ offer.outbound.baggages.carryOn }}× carry-on
											</span>
											<span :class="offer.refundable ? 'text-success-600' : 'text-error-600'">
												<UIcon :name="offer.refundable ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" class="inline mr-1" />
												{{ offer.refundable ? `Refundable${offer.refundPenalty ? ` (penalty ${offer.refundCurrency} ${offer.refundPenalty})` : ''}` : 'Non-refundable' }}
											</span>
											<span :class="offer.changeable ? 'text-success-600' : ''">
												<UIcon :name="offer.changeable ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" class="inline mr-1" />
												{{ offer.changeable ? 'Changeable' : 'Non-changeable' }}
											</span>
										</div>
										<UButton
											:to="googleFlightsUrl(offer)"
											target="_blank"
											rel="noopener noreferrer"
											variant="outline"
											color="neutral"
											size="sm"
											icon="i-lucide-external-link"
											trailing
											label="Search Google Flights"
										/>
									</div>
								</template>
							</UCard>
						</div>

						<UAlert
							v-else-if="selectedCityCode && !offersLoading"
							color="neutral"
							variant="subtle"
							icon="i-lucide-info"
							title="No flight offers found."
							description="Please try a different airport or search manually on Google Flights."
						/>
					</template>

					<UAlert
						v-else-if="!airportsLoading"
						color="neutral"
						variant="subtle"
						icon="i-lucide-info"
						:title="selectedCountryCode ? 'No airports found for this country.' : 'Select a country above to search for flights.'"
						description="Please search manually or contact the congress organisers for assistance."
					/>
				</div>
			</template>
		</UAccordion>
	</Container>
</template>
