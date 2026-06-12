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
				type: 'url' | 'page' | 'post' | 'modal';
				pagePermalink?: string | null;
				postSlug?: string | null;
			}>;
		};
	};
}

const { setAttr } = useVisualEditing();
const props = defineProps<MainHeroProps>();

type ButtonVariant = "solid" | "outline" | "ghost" | "soft";

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
    text-white
	ring-0
	bg-accent
	hover:text-white
	hover:bg-accent-600
  `,
  outline: `
    text-secondary
	bg-white/90
	ring-black
	hover:text-black
	
	hover:bg-white
    
  `,
  ghost: `
    text-primary
    bg-transparent
    hover:bg-primary/10
    focus:ring-primary
  `,
  soft: `
  	text-primary
	ring-secondary/90
    bg-secondary/70
    hover:bg-secondary/90
    focus:ring-primary
  `
};

const announcement = computed(() => props.data.announcements?.[0] ?? null);
const openAnnouncements = ref(false);
const visible = ref(false);
const textVisible = ref(false);
const modalOpen = ref(false);
const heroInView = ref(false);
const spriteLoaded = ref(false);
const inkState = ref<'idle' | 'opening' | 'open' | 'closing'>('idle');
const inkLayerRef = ref<HTMLElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const videoSrc = ref<string | null>(null);

const FRAME_RATIO = 1.78;
const FRAME_COUNT = 25;

function setInkDimensions() {
	const el = inkLayerRef.value as HTMLElement | null;
	if (!el) return;
	const w = window.innerWidth;
	const h = window.innerHeight;
	let lw, lh;
	if (w / h > FRAME_RATIO) {
		lw = w; lh = lw / FRAME_RATIO;
	} else {
		lh = h * 1.2; lw = lh * FRAME_RATIO;
	}
	el.style.width = (lw * FRAME_COUNT) + 'px';
	el.style.height = lh + 'px';
}

watch(modalOpen, (open) => {
	if (open) {
		videoSrc.value = '/images/intro.mp4';
		inkState.value = 'opening';
		nextTick(setInkDimensions);
		setTimeout(() => { inkState.value = 'open'; }, 1000);
	} else {
		inkState.value = 'closing';
		if (videoRef.value) {
			videoRef.value.pause();
			videoRef.value.currentTime = 0;
		}
		setTimeout(() => {
			inkState.value = 'idle';
			videoSrc.value = null;
		}, 800);
	}
});

const button_group = props.data.button_group;

const allButtons = button_group?.buttons.map((button) => ({
	...button,
	color: button.variant === 'outline' ? 'neutral' : 'accent',
	className: `
		${baseClasses}
		${variantClasses[button?.variant]}
	`
})) ?? []

const modalButtons = computed(() => allButtons.filter(b => b.type === 'modal'));
const navButtons = computed(() => allButtons.filter(b => b.type !== 'modal'));

const heroRef = useTemplateRef('heroRef');

onMounted(() => {
	const sprite = new Image();
	const fallbackTimer = setTimeout(() => { spriteLoaded.value = true; }, 3000);
	sprite.onload = () => { clearTimeout(fallbackTimer); spriteLoaded.value = true; };
	sprite.onerror = () => { clearTimeout(fallbackTimer); spriteLoaded.value = true; };
	sprite.src = '/images/ink-transition-sprite-white.png';

	const observer = new IntersectionObserver((entries) => {
		if (entries[0].isIntersecting) {
			heroInView.value = true;
			observer.disconnect();
		}
	});

	if (heroRef.value) observer.observe(heroRef.value);

	watchEffect(() => {
		if (heroInView.value && spriteLoaded.value && !visible.value) {
			visible.value = true;
			setTimeout(() => {
				textVisible.value = true;
				if (announcement.value) {
					setTimeout(() => { openAnnouncements.value = true; }, 1000);
				}
			}, 1500);
		}
	});
});
</script>

<template>
	<div ref="heroRef" class="relative pt-20 pb-6 h-[calc(100svh-var(--ui-header-height,4rem))] overflow-hidden"
		:style="{ '--herobg-color': data.bgcolor }"
		:class="`bg-[var(--herobg-color)]`">
			
			<div class="absolute inset-0 overflow-hidden ink-reveal ink-framed" :class="{ 'is-active': visible }" style="--ink-duration: 2s">
				<DirectusImage
					class="object-cover w-full h-full object-[25%_25%]"
					:class="{ 'opacity-0': !visible }"
					:uuid="props.data.image"
					:data-directus="
						setAttr({
							collection: 'block_mainhero',
							item: data?.id,
							fields: 'image',
							mode: 'modal' })
					"/>
				<div class="ink-overlay" />
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
						class="text-shadow-none absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-lg px-10 max-h-[80%] md:bottom-auto md:top-1/2 md:left-6 md:translate-x-0 md:-translate-y-1/2 md:w-1/2 md:px-0 lg:left-12 xl:left-50"
					>
						<UCard class=" bg-primary/95 shadow-2xl shadow-black ring-gray-600 ring-2">
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

			<div class="relative z-10">
				<div class="pl-6 mx-auto sm:px-8 lg:px-12 xl:px-50 max-w-8xl flex justify-end-safe ">
					<div class="w-full lg:w-2/3 xl:w-2/3 p-5 text-accent sm:bg-transparent lg:p-10 text-right  rounded-b-xl sm:h-auto">
						<!-- tagline -->
						<div class="tracking-tighter mt-0 lg:mt-0 transition-opacity duration-500 ease-out"
							:class="textVisible ? 'opacity-100' : 'opacity-0'">
							<Text class=" font-sans text-xl sm:text-xl text-right ml-10  text-black"
							:content="data.tagline"
							:data-directus="
									setAttr({
										collection: 'block_mainhero',
										item: data.id,
										fields: 'tagline',
										mode: 'modal' })">{{ props.data.tagline }}
							</Text>
							<!-- logo + headline -->
							<div class="flex flex-row justify-end transition-opacity duration-500 ease-out delay-150"
								:class="textVisible ? 'opacity-100' : 'opacity-0'">
								<DirectusImage
									v-if="data.logo"
									class="block w-auto h-40 sm:h-50 xl:h-55 2xl:h-90"
									:class="textVisible ? 'opacity-100' : 'opacity-0'"
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
									<Text class="font-heading italic font-normal text-7xl md:text-8xl inline text-black"
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
						</div>
						<!-- description -->
						<Label
							class="mt-2 font-sans text-xs font-sans leading-7 text-black text-opacity-70 sm:text-lg italic transition-opacity duration-500 ease-out delay-250"
							:class="textVisible ? 'opacity-100' : 'opacity-0'"
							:data-directus="
										setAttr({
											collection: 'block_mainhero',
											item: data.id,
											fields: 'description',
											mode: 'modal' })">
							{{ data.description }}
						</Label>
						<!-- date + venue -->
						<div class="transition-opacity duration-500 ease-out delay-400"
							:class="textVisible ? 'opacity-100' : 'opacity-0'">
							<Text
								class=" font-heading text-2xl lg:text-4xl font-bold mt-0 lg:mt-4"
								:content="date"
								:data-directus="
									setAttr({
										collection: 'congress',
										item: congress?.id,
										fields: 'startdate, enddate',
										mode: 'modal' })"
							/>
							<Label class="mt-2 leading-7 text-secondary text-2xl sm:text-3xl font-heading font-bold "
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
							class="mt-6 flex justify-end gap-4 image_left my-3 transition-opacity duration-500 ease-out delay-550"
							:class="textVisible ? 'opacity-100' : 'opacity-0'"
							:data-directus="setAttr({ collection: 'block_button_group', item: data.button_group?.id, fields: 'buttons', mode: 'modal' })">
							<div v-if="modalButtons.length" @click.capture.stop="modalOpen = true">
								<ButtonGroup :buttons="modalButtons" />
							</div>
							<ButtonGroup v-if="navButtons.length" :buttons="navButtons" />
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
							<vue-countdown :time="secondsUntil * 1000" v-slot="{ days, hours, minutes, seconds }" class="text-shadow-none text-black">
								<UBadge class="countdown-badge p-2 m-1 lg:m-2 text-lg lg:text-3xl text-center bg-transparent flex-col w-14 lg:w-20 transition-opacity duration-400 ease-out delay-550"
									:class="textVisible ? 'opacity-100' : 'opacity-0'"
									variant="solid" color="dark">{{days}}
									<template #trailing><p class="text-xs">Days</p></template>
								</UBadge>
								<UBadge class="countdown-badge p-2 m-1 lg:m-2 text-lg lg:text-3xl text-center flex-col w-14 lg:w-20 transition-opacity duration-400 ease-out delay-650"
									:class="textVisible ? 'opacity-100' : 'opacity-0'"
									variant="solid" color="black">{{hours}}
									<template #trailing><p class="text-xs">Hours</p></template>
								</UBadge>
								<UBadge class="countdown-badge p-2 m-1 lg:m-2 text-lg lg:text-3xl text-center flex-col w-14 lg:w-20 transition-opacity duration-400 ease-out delay-750"
									:class="textVisible ? 'opacity-100' : 'opacity-0'"
									variant="solid" color="black">{{minutes}}
									<template #trailing><p class="text-xs">Minutes</p></template>
								</UBadge>
								<UBadge class="countdown-badge p-2 m-1 lg:m-2 text-lg lg:text-3xl text-cente flex-col w-14 lg:w-20 transition-opacity duration-400 ease-out delay-850"
									:class="textVisible ? 'opacity-100' : 'opacity-0'"
									variant="solid" color="black">{{seconds}}
									<template #trailing><p class="text-xs">Seconds</p></template>
								</UBadge>
							</vue-countdown>
						</ClientOnly>
					</div>
					
				</div>
				
    		</div>


			<div v-if="data.partners?.length" class="absolute top-0 left-0 right-0 pt-2 z-10 transition-opacity duration-700 ease-out delay-1300"
				:class="textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'">
				<div class="px-6 mx-auto sm:px-8 lg:px-12 xl:px-50 max-w-8xl flex justify-end-safe">
					<div class="w-full lg:w-2/3 xl:w-2/3 px-5 lg:px-10 pt-2 pb-2 sm:pb-3 flex flex-col items-end gap-1.5">
						<div class="flex flex-col items-center gap-1.5 overflow-visible">
						<p class="text-black/70 text-[10px] sm:text-xs font-semibold uppercase tracking-widest whitespace-nowrap">In partnership with</p>
						<div class="flex flex-row items-center gap-4 sm:gap-6  scrollbar-none overflow-visible"
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
								<span class="text-gray-800/70 text-[9px] sm:text-2xs font-medium group-hover:text-black transition-colors leading-tight text-center w-16 sm:w-20 lg:w-24">
									{{ partner.organisation?.name || partner.organisation?.abbr || partner.organisation?.short_name }}
								</span>
							</div>
						</div>
					</div>
					</div>
				</div>
			</div>

		</div>

		<Teleport to="body">
			<!-- Ink blot transition layer -->
			<div
				class="ink-modal-layer"
				:class="{
					visible: inkState !== 'idle',
					opening: inkState === 'opening',
					closing: inkState === 'closing',
				}"
			>
				<div :ref="el => inkLayerRef = el as HTMLElement" class="ink-modal-bg" />
			</div>

			<!-- Modal content -->
			<div class="ink-modal-content" :class="{ visible: inkState === 'open' }">
				<div class="relative flex flex-col h-full w-full" style="background-color: #de9260;">
					
					<div class="relative h-full p-10 flex align-middle">
						<UButton
							icon="i-lucide-x"
							size="xl"
							color="neutral"
							variant="ghost"
							class="absolute top-6 right-6 text-white"
							@click="modalOpen = false"
						/>
						<video
							v-if="videoSrc"
							:ref="el => videoRef = el as HTMLVideoElement"
							:src="videoSrc"
							controls
							autoplay
							class="w-[90%] max-h-lvh m-auto"
						/>
						<slot name="modal-content" />
					</div>

				</div>
			</div>
		</Teleport>
</template>
