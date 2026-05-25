<template>
	<PanelCard v-model:active-title="activeIndex" :titles="titles"
			   class="d-flex flex-column flex-grow-1">
		<JobLayerChart v-if="activeKey === 'layerChart'" :settings="layerSettings" />
		<JobGCodeStream v-else-if="activeKey === 'gcodeStream'" />
		<component v-else-if="activePluginComponent" :is="activePluginComponent" />

		<template v-if="layerTabIndex >= 0" #[layerSettingsSlot]>
			<v-switch v-model="layerSettings.hideFirstLayer" color="primary"
					  :label="$t('chart.layer.settings.hideFirstLayer')"
					  v-hint="$t('chart.layer.settings.hideFirstLayerHint')"
					  density="comfortable" hide-details />
			<v-switch v-model="layerSettings.showAllLayers" color="primary"
					  :label="$t('chart.layer.settings.showAllLayers')"
					  v-hint="$t('chart.layer.settings.showAllLayersHint')"
					  density="comfortable" hide-details />

			<v-number-input v-model="layerSettings.lastLayerCount" :min="1" :step="5" :precision="0"
							:label="$t('chart.layer.settings.lastLayerCount')"
							v-hint="$t('chart.layer.settings.lastLayerCountHint')"
							variant="outlined" density="comfortable" hide-details />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import type { Component } from "vue";

import JobGCodeStream from "./JobGCodeStream.vue";
import JobLayerChart, { type LayerChartSettings, layerChartDefaults } from "./JobLayerChart.vue";
import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { getJobViewTabs } from "@/plugins";
import { useCacheStore } from "@/stores/cache";
import { useUiStore } from "@/stores/ui";

const cacheStore = useCacheStore();
const uiStore = useUiStore();

// Per-panel layer-chart settings. The id is pinned so the persisted record follows the
// chart even though it now lives inside this panel rather than being its own PanelCard
const layerSettings = useComponentSettings<LayerChartSettings>({ ...layerChartDefaults }, { id: "jobViewPanel::layerChart" });

interface ResolvedTab {
	key: string;
	icon: string;
	title: string;
	order: number;
	component?: Component;
}

// The layer chart is meaningless outside FFF, so it is offered only there; the G-code stream
// applies to every mode. Plugin tabs are merged in via getJobViewTabs()
const builtInTabs = [
	{ key: "layerChart", icon: "mdi-vector-polyline", caption: "chart.layer.caption", order: 10, condition: () => uiStore.isFFF },
	{ key: "gcodeStream", icon: "mdi-code-tags", caption: "jobViewPanel.gcodeStream", order: 20 },
];

function evalCondition(condition: boolean | (() => boolean) | undefined): boolean {
	if (condition === undefined) {
		return true;
	}
	return (typeof condition === "function") ? condition() : condition;
}

function resolveCaption(caption: string | (() => string), translated?: boolean): string {
	const raw = (typeof caption === "function") ? caption() : caption;
	return translated ? raw : i18n.global.t(raw);
}

const availableTabs = computed<Array<ResolvedTab>>(() => {
	const builtIn: Array<ResolvedTab> = builtInTabs
		.filter(tab => evalCondition(tab.condition))
		.map(tab => ({ key: tab.key, icon: tab.icon, title: resolveCaption(tab.caption), order: tab.order }));
	const plugin: Array<ResolvedTab> = getJobViewTabs()
		.filter(tab => evalCondition(tab.condition))
		.map(tab => ({
			key: tab.key,
			icon: tab.icon,
			title: resolveCaption(tab.caption, tab.translated),
			order: tab.order ?? 100,
			component: tab.component,
		}));
	return [...builtIn, ...plugin].sort((a, b) => a.order - b.order);
});

const titles = computed(() => availableTabs.value.map(tab => ({ icon: tab.icon, title: tab.title })));

// The persisted choice is kept untouched when its tab is unavailable, so it is restored if
// the tab returns (mode switch, plugin load) - mirrors ToolsPanel's active-tab clamp
const selectedKey = ref(cacheStore.activeJobViewTab);
const activeKey = computed<string>(() =>
	availableTabs.value.some(tab => tab.key === selectedKey.value)
		? selectedKey.value
		: (availableTabs.value[0]?.key ?? ""));

const activeIndex = computed<number>({
	get: () => Math.max(0, availableTabs.value.findIndex(tab => tab.key === activeKey.value)),
	set: (index) => {
		const key = availableTabs.value[index]?.key;
		if (key) {
			selectedKey.value = key;
			cacheStore.activeJobViewTab = key;
		}
	},
});

const activePluginComponent = computed<Component | undefined>(() =>
	availableTabs.value.find(tab => tab.key === activeKey.value)?.component);

const layerTabIndex = computed(() => availableTabs.value.findIndex(tab => tab.key === "layerChart"));
const layerSettingsSlot = computed(() => `settings-${layerTabIndex.value}`);
</script>
