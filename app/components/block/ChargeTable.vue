<script setup lang="ts">
interface CongressChargeData {
	id: string;
	sub_category?: string | null;
	price?: string | null;
}

interface ColumnCharge {
	id?: string;
	charge?: CongressChargeData | null;
	detail?: string;
}

interface Column {
	id: string;
	heading?: string | null;
	sort?: number | null;
	charges?: ColumnCharge[] | null;
}

interface Tab {
	id: string;
	label?: string | null;
	title?: string | null;
	row_labels?: string | string[] | null;
	columns?: Column[] | null;
}

interface ChargeTableProps {
	data: {
		id: string;
		headline?: string | null;
		tagline?: string | null;
		tabs?: Tab[] | null;
	};
}

interface TabItem {
	id: string;
	label: string;
	rowLabels: string[];
	columnMaps: (Column & { map: Record<string, {}> })[];
}

const props = defineProps<ChargeTableProps>();
const { setAttr } = useVisualEditing();

const activeTab = ref('0');

const tabs = computed<TabItem[]>(() =>
	(props.data.tabs ?? []).map((tab: Tab) => {
		const rowLabels: string[] = Array.isArray(tab.row_labels)
			? tab.row_labels
			: typeof tab.row_labels === 'string' && tab.row_labels.trim().startsWith('[')
				? JSON.parse(tab.row_labels)
				: [];

		const columns = [...(tab.columns ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

		const columnMaps = columns.map(col => {
			const map: Record<string, {}> = {};
			col.charges?.forEach((junction: ColumnCharge) => {
				const charge = junction.charge;
				if (charge?.sub_category) {
					map[charge.sub_category] = {
						id: junction.id,
						detail: junction.detail ?? charge.price ?? '—'
					}
					
				}
			});
			return { ...col, map };
		});

		return {
			id: tab.id,
			label: tab.label ?? tab.title ?? '',
			rowLabels,
			columnMaps,
		};
	})
);

onMounted(async () => {
	await nextTick();
	window.dispatchEvent(new CustomEvent('directus:refresh'));
});

const onTabChange = async () => {
	await nextTick();
	requestAnimationFrame(() => {
		window.dispatchEvent(new CustomEvent('directus:refresh'));
	});
};
</script>

<template>
	
	<Headline
		:headline="data.headline"
		:data-directus="setAttr({ collection: 'block_chargetable', item: data.id, fields: 'headline', mode: 'popover' })"
	/>
	<UTabs
		v-if="tabs.length"
		:items="(tabs as TabItem[])"
		label-key="label"
		color="accent"
		v-model="activeTab"
		@update:modelValue="onTabChange"
		:data-directus="setAttr({ 
									collection: 'block_chargetable', 
									item: data.id, 
									fields: ['tabs', 'charges'], 
									mode: 'modal' })"
		
	>
		<template #content="{ item }">
			<div
				:data-directus="setAttr({ 
									collection: 'block_chargetable_tabs', 
									item: item.id, 
									fields: ['heading', 'charges'], 
									mode: 'modal' })"
				class="overflow-x-auto"			>
				<table class="w-full text-lg">
					<thead>
						<tr>
							<th class="bg-secondary-400 text-white text-left p-3 font-medium w-40"></th>
							<th
								v-for="col in (item as unknown as TabItem).columnMaps"
								:key="col.id"
								class="bg-secondary-400 text-white text-left p-3 font-medium whitespace-normal"
								:data-directus="setAttr({ 
									collection: 'block_chargetable_columns', 
									item: col.id, 
									fields: ['heading', 'charges'], 
									mode: 'modal' })"
							>
								{{ col.heading }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(rowLabel, i) in (item as unknown as TabItem).rowLabels"
							:key="rowLabel"
							:class="i % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
							:data-directus="setAttr({ 
									collection: 'block_chargetable_tabs', 
									item: item.id, 
									fields: ['row_labels'], 
									mode: 'modal' })"
						>
							<td class="p-3 font-medium text-gray-700">{{ rowLabel }}</td>
							<td
								v-for="col in (item as unknown as TabItem).columnMaps"
								:key="col.id"
								class="p-3 text-gray-600"
							>
							
								{{ col.map[rowLabel]?.detail ?? '' }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>
	</UTabs>
</template>
