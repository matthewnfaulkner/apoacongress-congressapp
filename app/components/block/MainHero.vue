<script setup lang="ts">
import { DateTime } from "luxon";
import { dateStringToHumanString } from '@/utils/time-utils';

const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.getSiteData() as Site;

const congresses = siteData?.congress;
const congress = congresses ? congresses[0] : null;

const timezone = congress?.timezone;
const startDate = congress?.startdate;
const endDate = congress?.enddate;
const venue = congress?.venue?.title;
const dt = DateTime.fromFormat(startDate, "yyyy-MM-dd");

// 2️⃣ Format as "5th April 2027"
const month = dt.toFormat("LLLL");
const year = dt.toFormat("yyyy");
const formattedStartDate = dateStringToHumanString(startDate);
const formattedEndDate = dateStringToHumanString(endDate);
const date = `${month} ${formattedStartDate} - ${formattedEndDate} ${year}`;

// Parse the date in the given timezone and set time to 08:00
const target = DateTime
  .fromISO(startDate, { zone: timezone })
  .set({ hour: 8, minute: 0, second: 0, millisecond: 0 });

// Current time
const now = DateTime.now();

// Seconds between now and target
const secondsUntil = Math.floor(
  target.diff(now, "seconds").seconds
);

import  ButtonGroup  from '@/components/base/ButtonGroup.vue';
import type { BlockMainHeroPartner } from "~~/shared/types/schema";

interface MainHeroProps {
	data: {
		id: string;
		tagline: string;
		headline: string;
		description: string;
		countdown: boolean | null;
		bgcolor: string | null;
		image: string;
		logo?: string;
		announcements?: Array<{
			id: string;
			headline?: string | null;
			content?: string | null;
		}> | null;
		partners?: BlockMainHeroPartner[] | null;
		button_group?: {
			id: string;
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
	};
}

const { setAttr } = useVisualEditing();
const props = defineProps<MainHeroProps>();

type ButtonVariant = "solid" | "outline" | "ghost";

const baseClasses = `
  inline-flex
  px-5
  py-6
  rounded-full
  items-center
  ring-2
  cursor-pointer
  text-lg
`;

const variantClasses: Record<ButtonVariant, string> = {
  solid: `
    text-black
	ring-white
	bg-white
	hover:text-white
  `,
  outline: `
    text-white
	ring-white
	hover:text-black
	hover:bg-white
    focus:ring-white
  `,
  ghost: `
    text-primary
    bg-transparent
    hover:bg-primary/10
    focus:ring-primary
  `
};

const announcement = computed(() => props.data.announcements?.[0] ?? null);
const openAnnouncements = ref(false);
const visible = ref(false);
const button_group = props.data.button_group;

const buttons = button_group?.buttons.map((button) => ({
	...button,
	  className: `
		${baseClasses}
		${variantClasses[button?.variant]}
	`
})) ?? []

const heroRef = useTemplateRef('heroRef');

onMounted(() => {
	const observer = new IntersectionObserver((entries) => {
		if (entries[0].isIntersecting) {
			visible.value = true;
			if (announcement.value) {
				setTimeout(() => { openAnnouncements.value = true; }, 1500);
			}
			observer.disconnect();
		}
	});

	if (heroRef.value) observer.observe(heroRef.value);
});
</script>

<template>
	<div ref="heroRef" class="relative pt-20 pb-6 h-[calc(100svh-var(--ui-header-height,4rem))] overflow-hidden"
		:style="{ '--herobg-color': data.bgcolor }"
		:class="`bg-[var(--herobg-color)]`">
			
			<div class="absolute inset-0">
				<DirectusImage
					class="object-cover w-full h-full object-top-left transition-all duration-900 ease-out"
					:class="visible ? 'opacity-100 scale-100' : 'opacity-0 scale-105'"
					:uuid="props.data.image"
					:data-directus="
						setAttr({
							collection: 'block_mainhero',
							item: data?.id,
							fields: 'image',
							mode: 'modal' })
					"/>
				<Transition
						enter-active-class="transition ease-out duration-300"
						enter-from-class="opacity-0 translate-y-4"
						enter-to-class="opacity-100 translate-y-0"
						leave-active-class="transition ease-in duration-200"
						leave-from-class="opacity-100 translate-y-0"
						leave-to-class="opacity-0 translate-y-4"
					>
					<div
						v-if="openAnnouncements"
						class="text-shadow-none absolute  bottom-30 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-lg px-10 lg:px-0 max-h-[80%]"
					>
						<UCard class="shadow-xl bg-primary shadow-2xl shadow-black">
							<div class="flex flex-col gap-2">
								<div class="flex items-center gap-3">
									<p class="font-semibold text-sm flex-1 text-center">{{ announcement?.headline }}</p>
									<UButton
										icon="i-lucide-x"
										color="neutral"
										variant="ghost"
										size="xs"
										class="shrink-0"
										@click="openAnnouncements = false"
									/>
								</div>
								<div class="overflow-y-auto max-h-100 prose prose-sm dark:prose-invert max-w-none">
									<div v-html="announcement?.content" />
								</div>
							</div>
						</UCard>
					</div>
				</Transition>
			</div>

			<div class="relative">
				<div class="px-6 mx-auto sm:px-8 lg:px-12 xl:px-50 max-w-8xl flex justify-end-safe ">
					<div class="w-full lg:w-2/3 xl:w-2/3 p-5 text-white bg-secondary/60 sm:bg-transparent lg:p-10 text-right text-shadow-black text-shadow-lg rounded-b-xl sm:h-auto">
						<!-- tagline -->
						<p class="tracking-tighter  mt-0 lg:mt-0 transition-all duration-500 ease-out"
							:class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'">
							<Text class=" font-heading text-md sm:text-xl text-center sm:text-right text-white"
							:content="data.tagline"
							:data-directus="
									setAttr({
										collection: 'block_mainhero',
										item: data.id,
										fields: 'tagline',
										mode: 'modal' })">{{ props.data.tagline }}
							</Text>
							<!-- logo + headline -->
							<div class="flex flex-row justify-end transition-all duration-500 ease-out delay-150"
								:class="visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'">
								<DirectusImage
									v-if="data.logo"
									class="inline h-40 sm:h-50 xl:h-65"
									:class="visible ? 'opacity-100 scale-100' : 'opacity-0 scale-105'"
									:uuid="props.data.logo"
									:data-directus="
										setAttr({
											collection: 'block_mainhero',
											item: data?.id,
											fields: 'logo',
											mode: 'modal' })
									"/>
								<div v-else class="flex ">
									<NuxtImg  src="/images/apoalogo.png" class="inline h-auto max-h-65"/>
									<Text class="font-heading italic font-normal text-7xl md:text-8xl inline text-white"
										:content="data.headline"
										:item-id="data.id"
										:data-directus="
											setAttr({
												collection: 'block_mainhero',
												item: data.id,
												fields: 'headline',
												mode: 'modal' })"
									/>
								</div>
							</div>
						</p>
						<!-- description -->
						<Label
							class="mt-2 font-sans text-xs font-normal leading-7 text-white text-opacity-70 sm:text-lg italic transition-all duration-500 ease-out delay-250"
							:class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
							:data-directus="
										setAttr({
											collection: 'block_mainhero',
											item: data.id,
											fields: 'description',
											mode: 'modal' })">
							{{ data.description }}
						</Label>
						<!-- date + venue -->
						<div class="transition-all duration-500 ease-out delay-400"
							:class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'">
							<Text
								class="mt-2 font-sans text-xl lg:text-2xl font-bold"
								:content="date"
								:data-directus="
									setAttr({
										collection: 'congress',
										item: congress?.id,
										fields: 'startdate, enddate',
										mode: 'modal' })"
							/>
							<Label class="mt-2 leading-7 text-accent-400 text-2xl sm:text-3xl font-heading font-bold "
								:label="congress?.venue?.title"
								key="venue"
								:item-id="congress?.venue.id"
								:data-directus="
									setAttr({
										collection: 'congress',
										item: congress?.id,
										fields: 'venue',
										mode: 'modal' })"
							>{{ venue }}</Label>
						</div>
						<!-- buttons -->
						<div
							v-if="data.button_group?.buttons?.length"
							class="mt-6 flex justify-end image_left my-3 transition-all duration-500 ease-out delay-550"
							:class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'">
							<ButtonGroup
								:buttons="buttons"
								:data-directus="
									setAttr({
										collection: 'block_button_group',
										item: data.button_group?.id,
										fields: 'buttons',
										mode: 'modal' })
								"
							/>
						</div>
						<!-- countdown -->
						<ClientOnly v-if="data.countdown && secondsUntil"
							:data-directus="
									setAttr({
										collection: 'block_mainhero',
										item: data?.id,
										fields: 'countdown',
										mode: 'modal' })
								"
						>
							<vue-countdown :time="secondsUntil * 1000" v-slot="{ days, hours, minutes, seconds }" class="text-shadow-none">
								<UBadge class="p-2 m-1 lg:m-2 text-xs lg:text-3xl text-center text-secondary flex-col w-14 lg:w-20 transition-all duration-400 ease-out delay-550"
									:class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
									variant="solid" color="primary">{{days}}
									<template #trailing><p class="text-xs">Days</p></template>
								</UBadge>
								<UBadge class="p-2 m-1 lg:m-2 text-xs lg:text-3xl text-center text-secondary flex-col w-14 lg:w-20 transition-all duration-400 ease-out delay-650"
									:class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
									variant="solid" color="primary">{{hours}}
									<template #trailing><p class="text-xs">Hours</p></template>
								</UBadge>
								<UBadge class="p-2 m-1 lg:m-2 text-xs lg:text-3xl text-center text-secondary flex-col w-14 lg:w-20 transition-all duration-400 ease-out delay-750"
									:class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
									variant="solid" color="primary">{{minutes}}
									<template #trailing><p class="text-xs">Minutes</p></template>
								</UBadge>
								<UBadge class="p-2 m-1 lg:m-2 text-xs lg:text-3xl text-center text-secondary flex-col w-14 lg:w-20 transition-all duration-400 ease-out delay-850"
									:class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
									variant="solid" color="primary">{{seconds}}
									<template #trailing><p class="text-xs">Seconds</p></template>
								</UBadge>
							</vue-countdown>
						</ClientOnly>
					</div>
					
				</div>
				
    		</div>


			<div v-if="data.partners?.length" class="absolute top-0 left-0 right-0 pt-2">
				<div class="px-6 mx-auto sm:px-8 lg:px-12 xl:px-50 max-w-8xl flex justify-end-safe">
					<div class="w-full lg:w-2/3 xl:w-2/3 px-5 lg:px-10 pt-2 pb-2 sm:pb-3 flex flex-col items-end gap-1.5">
						<div class="flex flex-col items-center gap-1.5">
						<p class="text-white/70 text-[10px] sm:text-xs font-semibold uppercase tracking-widest whitespace-nowrap">In partnership with</p>
						<div class="flex flex-row items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none"
						:data-directus="
									setAttr({
										collection: 'block_mainhero',
										item: data.id,
										fields: 'partners',
										mode: 'modal' })
								">
							<div 
								v-for="partner in data.partners" 
								:key="partner.id" class="flex flex-col items-center gap-0.5 group shrink-0"
								>
								<DirectusImage
									v-if="partner.organisation?.logo"
									:uuid="partner.organisation.logo"
									class="h-6 sm:h-8 lg:h-12 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
								/>
								<NuxtImg v-else src="/images/apoalogo.png" class="h-6 sm:h-8 lg:h-12 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
								<span class="text-white/70 text-[9px] sm:text-2xs font-medium group-hover:text-white transition-colors leading-tight text-center w-16 sm:w-20 lg:w-24">
									{{ partner.organisation?.name || partner.organisation?.abbr || partner.organisation?.short_name }}
								</span>
							</div>
						</div>
					</div>
					</div>
				</div>
			</div>

		</div>
</template>
