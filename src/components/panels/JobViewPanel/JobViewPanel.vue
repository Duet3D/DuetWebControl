<style scoped>
.plugin-tab-content {
	min-height: 0;
}
</style>

<template>
	<PanelCard v-model:active-title="activeIndex" :titles="titles"
			   class="d-flex flex-column flex-grow-1">
		<JobPreview v-if="activeKey === 'preview'" :settings="previewSettings" />
		<JobLayerChart v-else-if="activeKey === 'layerChart'" :settings="layerSettings" />
		<JobGCodeStream v-else-if="activeKey === 'gcodeStream'" />
		<!-- Plugin tabs (e.g. the G-code viewer) fill the remaining panel height; their own
			 height: 100% / flex roots size against this box -->
		<div v-else-if="activePluginComponent" class="plugin-tab-content flex-grow-1 d-flex flex-column">
			<component :is="activePluginComponent" />
		</div>

		<template #title-append>
			<v-menu v-if="settingsStore.enablePanelEditing" location="bottom end" :close-on-content-click="false">
				<template #activator="{ props: menuProps }">
					<v-btn v-bind="menuProps" icon="mdi-eye" variant="text" size="small" density="comfortable"
						   :title="$t('jobViewPanel.toggleTabs')" />
				</template>
				<v-list density="compact">
					<v-list-item v-for="tab in candidateTabs" :key="tab.key" @click="toggleTab(tab.key)">
						<template #prepend>
							<v-icon :color="isTabHidden(tab.key) ? undefined : 'primary'">
								{{ isTabHidden(tab.key) ? "mdi-checkbox-blank-outline" : "mdi-checkbox-marked" }}
							</v-icon>
						</template>
						<v-list-item-title>
							<v-icon size="small" class="mr-1">{{ tab.icon }}</v-icon>
							{{ tab.title }}
						</v-list-item-title>
					</v-list-item>
				</v-list>
			</v-menu>
		</template>

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

		<template v-if="previewTabIndex >= 0" #[previewSettingsSlot]>
			<v-switch v-model="previewSettings.showProgressOverlay" color="primary"
					  :label="$t('jobViewPanel.previewSettings.showProgressOverlay')"
					  v-hint="$t('jobViewPanel.previewSettings.showProgressOverlayHint')"
					  density="comfortable" hide-details />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import type { Component } from "vue";

import JobGCodeStream from "./JobGCodeStream.vue";
import JobLayerChart, { type LayerChartSettings, layerChartDefaults } from "./JobLayerChart.vue";
import JobPreview, { type PreviewSettings, previewDefaults } from "./JobPreview.vue";
import { useComponentCache } from "@/composables/useComponentCache";
import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { getJobViewTabs } from "@/plugins";
import { scrollPageToBottom } from "@/router";
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const cacheStore = useCacheStore();
const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

// Per-panel settings, pinned ids so the persisted records follow each view even though they
// live inside this shared panel rather than being their own PanelCards. The ids are also handed to
// PanelCard per title so its Reset targets the right record when several tabs carry settings
const LAYER_SETTINGS_ID = "jobViewPanel::layerChart", PREVIEW_SETTINGS_ID = "jobViewPanel::preview";
const layerSettings = useComponentSettings<LayerChartSettings>({ ...layerChartDefaults }, { id: LAYER_SETTINGS_ID });
const previewSettings = useComponentSettings<PreviewSettings>({ ...previewDefaults }, { id: PREVIEW_SETTINGS_ID });

// The preview tab appears only while the loaded job carries at least one thumbnail with data
const hasPreview = computed(() => {
	const file = machineStore.model.job.file;
	return file !== null && file.thumbnails.some(thumbnail => !!thumbnail.data);
});

interface ResolvedTab {
	key: string;
	icon: string;
	title: string;
	order: number;
	component?: Component;
	settingsId?: string;
	scrollToBottom?: boolean;
}

// The layer chart is meaningless outside FFF, so it is offered only there; the G-code stream
// applies to every mode. Plugin tabs are merged in via getJobViewTabs()
const builtInTabs: Array<{ key: string; icon: string; caption: string; order: number; condition?: () => boolean; settingsId?: string; scrollToBottom?: boolean }> = [
	{ key: "layerChart", icon: "mdi-vector-polyline", caption: "chart.layer.caption", order: 10, condition: () => uiStore.isFFF, settingsId: LAYER_SETTINGS_ID },
	{ key: "preview", icon: "mdi-image", caption: "jobViewPanel.preview", order: 15, condition: () => hasPreview.value, settingsId: PREVIEW_SETTINGS_ID },
	{ key: "gcodeStream", icon: "mdi-code-tags", caption: "jobViewPanel.gcodeStream", order: 20, scrollToBottom: true },
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

// Every tab whose own condition (machine mode, preview availability, ...) is met. The eye menu
// lists these so a user can re-show one they hid; availableTabs narrows them by that choice
const candidateTabs = computed<Array<ResolvedTab>>(() => {
	const builtIn: Array<ResolvedTab> = builtInTabs
		.filter(tab => evalCondition(tab.condition))
		.map(tab => ({ key: tab.key, icon: tab.icon, title: resolveCaption(tab.caption), order: tab.order, settingsId: tab.settingsId, scrollToBottom: tab.scrollToBottom }));
	const plugin: Array<ResolvedTab> = getJobViewTabs()
		.filter(tab => evalCondition(tab.condition))
		.map(tab => ({
			key: tab.key,
			icon: tab.icon,
			title: resolveCaption(tab.caption, tab.translated),
			order: tab.order ?? 100,
			component: tab.component,
			scrollToBottom: tab.scrollToBottom,
		}));
	return [...builtIn, ...plugin].sort((a, b) => a.order - b.order);
});

function isTabHidden(key: string): boolean {
	return cacheStore.jobViewHiddenTabs.includes(key);
}

function toggleTab(key: string) {
	// Filtering first then conditionally re-adding both flips the entry and dedupes any stale copy
	const hidden = cacheStore.jobViewHiddenTabs.filter(entry => entry !== key);
	if (!isTabHidden(key)) {
		hidden.push(key);
	}
	cacheStore.jobViewHiddenTabs = hidden;
}

const availableTabs = computed<Array<ResolvedTab>>(() => candidateTabs.value.filter(tab => !isTabHidden(tab.key)));

const titles = computed(() => availableTabs.value.map(tab => ({ icon: tab.icon, title: tab.title, settingsId: tab.settingsId })));

// Last selected tab persisted per panel instance. A derived (positional) id means two panels in a
// custom layout each remember their own tab, rather than sharing one global choice
const tabCache = useComponentCache<{ activeTab: string }>({ activeTab: "" });

// The persisted choice is kept untouched when its tab is unavailable, so it is restored if
// the tab returns (mode switch, plugin load) - mirrors ToolsPanel's active-tab clamp
const selectedKey = ref(tabCache.value.activeTab);
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
			tabCache.value.activeTab = key;
		}
	},
});

// Maximise a viewport-filling tab (the Monaco G-code viewer) by scrolling the page so the status
// row above slides off the top, matching the standalone full-page viewer. scrollPageToBottom is a
// no-op below md and when the user disabled auto-scroll, and chases the panel as its height settles
function scrollForActiveTab() {
	if (availableTabs.value.find(tab => tab.key === activeKey.value)?.scrollToBottom) {
		scrollPageToBottom();
	}
}

watch(activeKey, () => nextTick(scrollForActiveTab));
onMounted(() => nextTick(scrollForActiveTab));

// Re-sync from the cache when the panel is revealed again - covers the panel living under
// keep-alive, where setup runs once and the cache may have moved on since deactivation
onActivated(() => {
	selectedKey.value = tabCache.value.activeTab;
	nextTick(scrollForActiveTab);
});

const activePluginComponent = computed<Component | undefined>(() =>
	availableTabs.value.find(tab => tab.key === activeKey.value)?.component);

const layerTabIndex = computed(() => availableTabs.value.findIndex(tab => tab.key === "layerChart"));
const layerSettingsSlot = computed(() => `settings-${layerTabIndex.value}`);

const previewTabIndex = computed(() => availableTabs.value.findIndex(tab => tab.key === "preview"));
const previewSettingsSlot = computed(() => `settings-${previewTabIndex.value}`);
</script>
