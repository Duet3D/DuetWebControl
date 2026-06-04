<template>
	<v-app>
		<v-app-bar :elevation="2" :height="appBarHeight">
			<v-app-bar-nav-icon v-if="showDrawerToggle" @click="drawer = !drawer" />
			<v-btn v-else-if="showBackButton" icon="mdi-arrow-left" variant="text"
				   :size="isLargeButtons ? 'large' : undefined"
				   :aria-label="$t('layout.backToHub')" @click="goHub" />

			<div id="title" class="text-truncate machine-name"
				 :class="[isLargeButtons ? 'text-headline-medium' : 'text-title-large',
						  isLargeButtons ? 'ms-5 me-2' : 'ms-3 me-1']"
				 :title="machineName">
				{{ machineName }}
			</div>

			<ConnectButton v-if="showConnectButton && isMdAndUp" :class="isLargeButtons ? 'ms-5' : 'ms-3'" />

			<v-spacer />

			<template v-if="showHeaderJobProgress">
				<v-progress-circular :model-value="headerJobProgressValue" :color="headerJobProgressColor"
									 size="40" width="4" class="header-job-progress"
									 role="button" :title="$t('layout.goToJobStatus')"
									 @click="router.push('/Job/Status')">
					<span class="text-body-small">{{ Math.round(headerJobProgressValue) }}%</span>
				</v-progress-circular>
				<v-spacer />
			</template>

			<!-- Status panel toggle on xs/sm only; md+ keeps the panel rendered unconditionally.
				 The isAtHub guard hides the toggle on `/` where the nav-tiles hub takes over so
				 there's no underlying page panel to toggle. Icon-only on xs, icon + caption on sm -->
			<v-btn v-if="!smAndUp && !isAtHub" icon="mdi-list-status" variant="tonal" rounded="md"
				   :active="settingsStore.showStatusPanel"
				   :color="settingsStore.showStatusPanel ? 'primary' : undefined"
				   :title="settingsStore.showStatusPanel ? $t('layout.hideStatusPanel') : $t('layout.showStatusPanel')"
				   @click="settingsStore.showStatusPanel = !settingsStore.showStatusPanel" />
			<v-btn v-else-if="!isMdAndUp && !isAtHub" prepend-icon="mdi-list-status" variant="tonal"
				   :size="isLargeButtons ? 'large' : undefined"
				   :active="settingsStore.showStatusPanel"
				   :color="settingsStore.showStatusPanel ? 'primary' : undefined"
				   :title="settingsStore.showStatusPanel ? $t('layout.hideStatusPanel') : $t('layout.showStatusPanel')"
				   @click="settingsStore.showStatusPanel = !settingsStore.showStatusPanel">
				{{ $t("layout.statusPanel") }}
			</v-btn>

			<CodeInput v-if="isMdAndUp" class="flex-grow-0 flex-shrink-0 code-input"
					   :class="isLargeButtons ? 'mx-5' : 'mx-3'" />

			<v-spacer />

			<UploadButton v-if="lgAndUp" :class="isLargeButtons ? 'ms-5' : 'ms-3'" />

			<EmergencyButton v-if="settingsStore.showEmergencyStop" :class="isLargeButtons ? 'ms-5 me-4' : 'ms-3 me-2'" :large="isLargeButtons" />
		</v-app-bar>

		<v-navigation-drawer v-if="isMdAndUp" v-model="drawer"
							 :rail="settingsStore.iconMenu" :expand-on-hover="settingsStore.iconMenu">
			<!-- Rail mode hides everything in v-list except first elements, so nested v-list-group
				 children disappear and only category activators (which aren't navigable) remain.
				 Render a flat list of leaf items in compact mode so the rail shows real navigation
				 targets; the grouped layout is kept for the regular drawer -->
			<v-list v-if="settingsStore.iconMenu" nav density="compact">
				<v-list-item v-for="item in menuStore.allItems" :key="item.path"
							 :to="item.path" :prepend-icon="item.icon"
							 :title="resolveItemTitle(item)">
					<template v-if="resolveBadge(item)" #append>
						<NavMenuBadge :badge="resolveBadge(item)!" />
					</template>
				</v-list-item>
			</v-list>
			<v-list v-else nav density="compact" v-model:opened="openedCategories" open-strategy="multiple">
				<template v-for="category in menuStore.visibleCategories" :key="category.key">
					<v-list-item v-if="shouldFlattenCategory(category)"
								 :to="menuStore.itemsByCategory(category.key)[0].path"
								 :prepend-icon="menuStore.itemsByCategory(category.key)[0].icon"
								 :title="resolveItemTitle(menuStore.itemsByCategory(category.key)[0])">
						<template v-if="resolveBadge(menuStore.itemsByCategory(category.key)[0])" #append>
							<NavMenuBadge :badge="resolveBadge(menuStore.itemsByCategory(category.key)[0])!" />
						</template>
					</v-list-item>
					<v-list-group v-else :value="category.key">
						<template #activator="{ props }">
							<v-list-item v-bind="props" :prepend-icon="category.icon"
										 :title="$t(category.captionKey)" />
						</template>
						<v-list-item v-for="item in menuStore.itemsByCategory(category.key)" :key="item.path"
									 :to="item.path" :prepend-icon="item.icon"
									 :title="resolveItemTitle(item)">
							<template v-if="resolveBadge(item)" #append>
								<NavMenuBadge :badge="resolveBadge(item)!" />
							</template>
						</v-list-item>
					</v-list-group>
				</template>
			</v-list>
		</v-navigation-drawer>

		<v-main>
			<template v-if="showHub">
				<v-container class="pa-3">
					<v-row density="compact">
						<v-col v-for="item in menuStore.allItems" :key="item.path" cols="6" sm="3">
							<v-card :to="hubTilePath(item)" min-height="110" variant="flat"
									:style="hubTileStyle(item)"
									class="d-flex flex-column align-center justify-center pa-3 h-100 position-relative">
								<NavMenuBadge v-if="resolveBadge(item)" :badge="resolveBadge(item)!"
											  size="default" no-clear class="hub-tile-badge" />
								<v-icon :icon="item.icon" size="36" class="mb-2" />
								<span class="text-title-medium text-center">
									{{ item.translated ? item.caption : $t(item.caption) }}
								</span>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</template>
			<div v-show="!showHub">
				<v-container v-if="statusPanelVisible" fluid>
					<FFFContainerPanel v-if="uiStore.isFFF" />
					<CNCContainerPanel v-else />
				</v-container>
				<v-divider v-if="statusPanelVisible" />

				<v-container fluid class="pa-0 pa-md-4">
					<router-view v-slot="{ Component, route }">
						<keep-alive>
							<component :is="route.meta.keepAlive ? Component : KeepAliveSink" />
						</keep-alive>
						<component v-if="!route.meta.keepAlive" :is="Component" />
					</router-view>
				</v-container>
			</div>

		</v-main>
	</v-app>
</template>

<script setup lang="ts">
import { defineComponent } from "vue";
import { useDisplay } from "vuetify";

import i18n from "@/i18n";

// Inert placeholder shown inside <keep-alive> whenever the active route opts out of caching.
// KeepAlive requires exactly one child; we can't conditionally unmount the wrapper itself
// without dropping all cached entries, so we park this stub in the slot instead. Routes opt
// into caching with `meta.keepAlive: true` in their <route> block
const KeepAliveSink = defineComponent({
	name: "KeepAliveSink",
	render: () => null,
});
import { MachineStatus } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";
import { type MenuBadge, type MenuCategoryDef, type MenuItem, useMenuStore } from "@/stores/menu";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { isPaused, isPrinting } from "@/utils/enums";

const machineStore = useMachineStore();
const menuStore = useMenuStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const route = useRoute();
const router = useRouter();

const { mdAndUp, lgAndUp, smAndUp, name: breakpointName } = useDisplay();
const isMdAndUp = mdAndUp;

// On small (sm) touchscreens such as 4.3" displays the app bar and page-level toolbars are
// enlarged for easier reach; the machine name and E-STOP button scale up with it. Vuetify
// exposes the resulting app-bar height as the --v-layout-top CSS variable on <v-main>, which
// the viewport-filling pages and plugin canvases read - no second source of truth to keep synced
const isLargeButtons = computed(() => settingsStore.largeButtons && breakpointName.value === "sm");
const appBarHeight = computed(() => isLargeButtons.value ? 80 : 64);

// Drawer starts open on lg+ viewports and follows the lg breakpoint as the user resizes;
// inside lg the user retains manual control via the hamburger toggle. Pinned to a watcher so a
// desktop user dragging the window down through the lg/md threshold auto-collapses the drawer
const drawer = ref(lgAndUp.value);
watch(lgAndUp, (value) => {
	drawer.value = value;
});

const machineName = computed(() => machineStore.model.network.name || "Duet Web Control");

// In dev mode the user picks a hostname through the connect dialog rather than auto-connecting to localhost,
// so expose the manual connect button. Production always auto-connects, so the button just adds noise
const showConnectButton = import.meta.env.DEV;

const isAtHub = computed(() => route.path === "/");
// md+ always renders the panel; xs/sm follows the per-user setting toggled from the app-bar
const statusPanelVisible = computed(() => isMdAndUp.value || settingsStore.showStatusPanel);
const showDrawerToggle = computed(() => isMdAndUp.value);
const showBackButton = computed(() => !isMdAndUp.value && !isAtHub.value);
// Only show the hub when there is at least one tile to render; otherwise the placeholder route content renders normally
const showHub = computed(() => !isMdAndUp.value && isAtHub.value && menuStore.allItems.length > 0);

// Force-expanded list: writable model that we keep in sync with the visible category keys
const openedCategories = ref<string[]>([]);
watchEffect(() => {
	openedCategories.value = menuStore.visibleCategories.map(c => c.key);
});

function goHub() {
	router.push("/");
}

const isAtJobStatus = computed(() => route.path === "/Job/Status");
const showHeaderJobProgress = computed(() =>
	!isMdAndUp.value && !isAtHub.value && !isAtJobStatus.value
	&& isPrinting(machineStore.model.state.status)
);
const headerJobProgressValue = computed(() => machineStore.jobProgress * 100);
const headerJobProgressColor = computed(() => {
	const status = machineStore.model.state.status;
	if (status === MachineStatus.cancelling) {
		return "error";
	}
	if (isPaused(status)) {
		return "warning";
	}
	return "success";
});

// Entries that read more compactly at md+ where the hub-tile context (and any disambiguating
// sibling entries) are gone. Maps the regular i18n key to the shorter md+ replacement
const SHORT_TITLES_MD_AND_UP: Record<string, string> = {
	"menu.job.status": "menu.job.statusShort",
	"menu.files.explorer": "menu.files.explorerShort",
};

function resolveItemTitle(item: MenuItem): string {
	if (!item.translated && isMdAndUp.value && SHORT_TITLES_MD_AND_UP[item.caption]) {
		return i18n.global.t(SHORT_TITLES_MD_AND_UP[item.caption]);
	}
	return item.translated ? item.caption : i18n.global.t(item.caption);
}

function resolveBadge(item: MenuItem): MenuBadge | null {
	return item.badge?.() ?? null;
}

// Hub tiles point at each menu item's path. The Dashboard item's path is `/`, but the hub itself
// also lives at `/`, so a literal `/` link would be a self-navigation vue-router treats as a
// no-op. Route through the wrapper at src/pages/Dashboard.vue (a distinct route record that
// renders index.vue's content) so the tile actually navigates. The drawer's Dashboard link at
// md+ stays on `/` because the hub doesn't render at md+ - no self-nav concern there
function hubTilePath(item: MenuItem): string {
	return item.path === "/" ? "/Dashboard" : item.path;
}

// RGB triples sit alongside the Vuetify palette names so a very low opacity overlay tints the
// tile without going opaque. Theme-agnostic - the same low-alpha colour reads as a subtle
// pastel on light surfaces and a soft glow on dark surfaces
const HUB_TILE_RGB: Record<string, string> = {
	blue:   "33, 150, 243",
	teal:   "0, 150, 136",
	green:  "76, 175, 80",
	amber:  "255, 193, 7",
	indigo: "63, 81, 181",
	purple: "156, 39, 176",
};

function hubTileStyle(item: MenuItem): Record<string, string> {
	const category = menuStore.categories.find((c) => c.key === item.category);
	const colorName = item.color ?? category?.color;
	const rgb = colorName ? HUB_TILE_RGB[colorName] : null;
	return rgb ? { backgroundColor: `rgba(${rgb}, 0.08)` } : {};
}

// Flatten a single-item category only when the parent label mirrors the child's. Settings>Settings
// reads as duplicated; Job>Status carries distinct meaning even with only one child today
function shouldFlattenCategory(category: MenuCategoryDef): boolean {
	const items = menuStore.itemsByCategory(category.key);
	if (items.length !== 1) {
		return false;
	}
	return i18n.global.t(category.captionKey) === resolveItemTitle(items[0]);
}
</script>

<style scoped>
.machine-name {
	min-width: 0;
	max-width: 12rem;
}
@media (min-width: 600px) {
	.machine-name { max-width: 20rem; }
}
@media (min-width: 840px) {
	.machine-name { max-width: none; }
}

.hub-tile-badge {
	position: absolute;
	top: 6px;
	right: 6px;
}

.header-job-progress {
	cursor: pointer;
}

.code-input {
	width: 330px;
}
@media (min-width: 1545px) {
	.code-input { width: 500px; }
}
@media (min-width: 2138px) {
	.code-input { width: 720px; }
}
</style>
