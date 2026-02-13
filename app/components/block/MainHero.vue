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
const formattedStartDate = dateStringToHumanString(startDate);
const formattedEndDate = dateStringToHumanString(endDate);

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

interface MainHeroProps {
	data: {
		id: string;
		tagline: string;
		headline: string;
		description: string;
		countdown: boolean | null;
		bgcolor: string | null;
		image: string;
		button_group?: {
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

const button_group = props.data.button_group;

const buttons = button_group?.buttons.map((button) => ({
	...button,
	  className: `
		${baseClasses}
		${variantClasses[button?.variant]}
	`
}))

</script>

<template>
	<div class="relative pt-0 pb-12 xl:pt-10 sm:pb-16 lg:pb-32 xl:pb-48 2xl:pb-56" 
		:style="{ '--herobg-color': data.bgcolor }"
		:class="`bg-[var(--herobg-color)]`">
			
			<div class="absolute inset-0">
				<DirectusImage class="object-cover w-full h-full object-top-left" :uuid="props.data.image"/>
			</div>

			<div class="relative">
				<div class="px-6 mx-auto sm:px-8 lg:px-12 xl:px-50 max-w-8xl flex justify-end-safe">
					<div class="w-full lg:w-2/3 xl:w-2/3 p-5 bg-secondary/80 sm:bg-transparent lg:p-10 text-right">
						<p class="tracking-tighter text-white mt-0 lg:mt-0">
							<span class=" font-heading text-2xl">{{ props.data.tagline }}
							</span><br />
							<span class="font-heading italic font-normal text-8xl">
								<NuxtImg src="/images/apoalogo.png" class="inline h-25"/>{{ props.data.headline }}
							</span>
						</p>
						<i class="mt-2 font-sans text-base font-normal leading-7 text-white text-opacity-70 text-md font-italic" v-html="data.description"></i>
						<p class="mt-2 font-sans text-xl font-bold text-white">April {{ formattedStartDate }} - {{formattedEndDate}}</p>
						<p class="mt-2 leading-7 text-accent-400  text-3xl font-heading font-bold ">{{ venue }}</p>
						<div
							v-if="data.button_group?.buttons?.length"
							class="mt-6 flex justify-end image_left my-3">
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
						<ClientOnly v-if="data.countdown && secondsUntil"> 
								<vue-countdown  :time="secondsUntil * 1000" v-slot="{ days, hours, minutes, seconds }">
								<UBadge class="p-2 m-2 text-3xl text-center text-secondary flex-col w-20" variant="solid" color="primary">{{days}}
									<template #trailing>
										<p class="text-xs">Days</p>
									</template>
								</UBadge>
								<UBadge class="p-2 m-2 text-3xl text-center text-secondary flex-col w-20" variant="solid" color="primary">{{hours}}
									<template #trailing>
										<p class="text-xs">Hours</p>
									</template>
								</UBadge>
								<UBadge class="p-2 m-2 text-3xl text-center text-secondary flex-col w-20" variant="solid" color="primary">{{minutes}}
									<template #trailing>
										<p class="text-xs">Minutes</p>
									</template>
								</UBadge>
								<UBadge class="p-2 m-2 text-3xl text-center text-secondary flex-col w-20" variant="solid" color="primary">{{seconds}}
									<template #trailing>
										<p class="text-xs">Seconds</p>
									</template>
								</UBadge>
								</vue-countdown>
						</ClientOnly>
					</div>
				</div>
    		</div>
		</div>
</template>
