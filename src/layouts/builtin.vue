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

:deep(.v-navigation-drawer .v-list-item-title) {
	font-size: 1rem;
	line-height: 1.1rem;
}

.menu-category-item:not(.v-list-item--active) :deep(.v-list-item-title),
.menu-category-item:not(.v-list-item--active) :deep(.v-list-item__prepend .v-icon) {
	color: rgb(var(--v-theme-main-menu-category));
}
.menu-route-item:not(.v-list-item--active) :deep(.v-list-item-title),
.menu-route-item:not(.v-list-item--active) :deep(.v-list-item__prepend .v-icon) {
	color: rgb(var(--v-theme-main-menu-route));
}

.route-area {
	position: relative;
}
@media (max-width: 839.98px) {
	.route-area { overflow-x: clip; }
}

.hub-forward-enter-active,
.hub-forward-leave-active,
.hub-back-enter-active,
.hub-back-leave-active {
	transition: transform 0.25s ease;
}
.hub-forward-leave-active,
.hub-back-leave-active {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
}
.hub-forward-enter-from { transform: translateX(100%); }
.hub-forward-leave-to { transform: translateX(-100%); }
.hub-back-enter-from { transform: translateX(-100%); }
.hub-back-leave-to { transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
	.hub-forward-enter-active,
	.hub-forward-leave-active,
	.hub-back-enter-active,
	.hub-back-leave-active {
		transition: none;
	}
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

.menu-resize-handle {
	position: fixed;
	bottom: 0;
	width: 7px;
	margin-left: -3px;
	cursor: ew-resize;
	touch-action: none;
	/* Above the drawer (z 1004) so the few px straddling its right edge stay grabbable */
	z-index: 1006;
}
.menu-resize-handle:hover {
	background: rgba(var(--v-theme-on-surface), 0.12);
}
</style>

<template>
	<v-app>
		<v-app-bar :elevation="2" :height="appBarHeight">
			<v-app-bar-nav-icon v-if="showDrawerToggle" @click="drawer = !drawer" />
			<v-btn v-else-if="showBackButton" icon="mdi-arrow-left" variant="text"
				   :size="isLargeButtons ? 'large' : undefined"
				   :aria-label="$t('layout.backToHub')" @click="goHub" />

			<v-btn v-if="canListDevices" icon="mdi-devices" variant="text"
				   :size="isLargeButtons ? 'large' : undefined"
				   :title="$t('layout.listDevices')" :aria-label="$t('layout.listDevices')"
				   @click="listDevices" />

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

		<v-navigation-drawer v-if="isMdAndUp" v-model="drawer" :width="menuWidth"
							 :rail="settingsStore.iconMenu" :expand-on-hover="settingsStore.iconMenu">
			<!-- Rail mode hides everything in v-list except first elements, so nested v-list-group
				 children disappear and only category activators (which aren't navigable) remain.
				 Render a flat list of leaf items in compact mode so the rail shows real navigation
				 targets; the grouped layout is kept for the regular drawer -->
			<v-list v-if="settingsStore.iconMenu" nav density="compact">
				<v-list-item v-for="item in menuStore.allItems" :key="item.path"
							 class="menu-route-item" v-hint="resolveItemCaption(item)"
							 :to="item.path" :prepend-icon="item.icon">
					<template #title>{{ resolveItemTitle(item) }}</template>
					<template v-if="resolveBadge(item)" #append>
						<NavMenuBadge :badge="resolveBadge(item)!" />
					</template>
				</v-list-item>
			</v-list>
			<v-list v-else nav density="compact" v-model:opened="openedCategories" open-strategy="multiple">
				<template v-for="category in menuStore.visibleCategories" :key="category.key">
					<v-list-item v-if="shouldFlattenCategory(category)"
								 class="menu-route-item"
								 v-hint="resolveItemCaption(menuStore.itemsByCategory(category.key)[0])"
								 :to="menuStore.itemsByCategory(category.key)[0].path"
								 :prepend-icon="menuStore.itemsByCategory(category.key)[0].icon">
						<template #title>{{ resolveItemTitle(menuStore.itemsByCategory(category.key)[0]) }}</template>
						<template v-if="resolveBadge(menuStore.itemsByCategory(category.key)[0])" #append>
							<NavMenuBadge :badge="resolveBadge(menuStore.itemsByCategory(category.key)[0])!" />
						</template>
					</v-list-item>
					<v-list-group v-else :value="category.key">
						<template #activator="{ props }">
							<v-list-item v-bind="props" class="menu-category-item" v-hint="$t(category.captionKey)" :prepend-icon="category.icon">
								<template #title>{{ $t(category.captionKey) }}</template>
							</v-list-item>
						</template>
						<v-list-item v-for="item in menuStore.itemsByCategory(category.key)" :key="item.path"
									 class="menu-route-item" v-hint="resolveItemCaption(item)"
									 :to="item.path" :prepend-icon="item.icon">
							<template #title>{{ resolveItemTitle(item) }}</template>
							<template v-if="resolveBadge(item)" #append>
								<NavMenuBadge :badge="resolveBadge(item)!" />
							</template>
						</v-list-item>
					</v-list-group>
				</template>
			</v-list>
		</v-navigation-drawer>

		<!-- Drag handle pinned to the drawer's right edge. Fixed-positioned rather than nested so it
			 spans the full height regardless of the drawer's own scroll. Hidden in rail/icon mode and
			 gated behind the panel-editing toggle, alongside the dashboard's other edit affordances -->
		<div v-if="isMdAndUp && drawer && !settingsStore.iconMenu && settingsStore.enablePanelEditing"
			 class="menu-resize-handle" :style="{ left: `${menuWidth}px`, top: `${appBarHeight}px` }"
			 @pointerdown="startMenuResize" />

		<v-main>
			<v-expand-transition>
				<div v-if="statusPanelVisible">
					<v-container class="global-container" fluid>
						<FFFContainerPanel v-if="uiStore.isFFF" />
						<CNCContainerPanel v-else />
					</v-container>
					<v-divider />
				</div>
			</v-expand-transition>

			<v-container fluid class="pa-0 pa-md-4 route-area">
				<!-- transitionName drives the hub slide below md (see its declaration); page caching
					 is route-driven inside DwcRouterView via meta.keepAlive -->
				<DwcRouterView :transition-name="transitionName" />
			</v-container>
		</v-main>
	</v-app>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";
// Transitions are declared as `export const` in vuetify/components, which the global
// component scanner (vite/dwc-vuetify-split) doesn't pick up, so import this one directly
import { VExpandTransition } from "vuetify/components";

import i18n from "@/i18n";

import { MachineStatus } from "@duet3d/objectmodel";

import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { type MenuBadge, type MenuCategoryDef, type MenuItem, useMenuStore } from "@/stores/menu";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { isPaused, isPrinting } from "@/utils/enums";
import { canListDevices, listDevices } from "@/utils/nativeApp";

const cacheStore = useCacheStore();
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

// Resizable navigation drawer. The persisted width lives in the cache (a per-browser UI preference,
// like the other view state there); a local ref drives the drawer during a drag so each pointer move
// doesn't churn the persisted store, and the final width is committed to the cache once on release
const MIN_MENU_WIDTH = 180, MAX_MENU_WIDTH = 480;
const menuWidth = ref(cacheStore.menuWidth);
watch(() => cacheStore.menuWidth, (value) => { menuWidth.value = value; });

function startMenuResize(event: PointerEvent) {
	event.preventDefault();
	const startX = event.clientX, startWidth = menuWidth.value;

	const onMove = (e: PointerEvent) => {
		menuWidth.value = Math.min(MAX_MENU_WIDTH, Math.max(MIN_MENU_WIDTH, startWidth + (e.clientX - startX)));
	};
	const onUp = () => {
		window.removeEventListener("pointermove", onMove);
		window.removeEventListener("pointerup", onUp);
		document.body.style.userSelect = "";
		cacheStore.menuWidth = menuWidth.value;
	};

	document.body.style.userSelect = "none";
	window.addEventListener("pointermove", onMove);
	window.addEventListener("pointerup", onUp);
}

const machineName = computed(() => machineStore.model.network.name || "Duet Web Control");

// In dev mode the user picks a hostname through the connect dialog rather than auto-connecting to localhost,
// so expose the manual connect button. Production always auto-connects, so the button just adds noise
const showConnectButton = import.meta.env.DEV;

const isAtHub = computed(() => route.path === "/");
// Below md the `/` route renders the nav hub instead of the dashboard; the status container is the
// dashboard's own chrome, so suppress it there. md+ always shows it; xs/sm follows the per-user
// setting toggled from the app-bar
const showHub = computed(() => !isMdAndUp.value && isAtHub.value && menuStore.allItems.length > 0);
const statusPanelVisible = computed(() => (isMdAndUp.value || settingsStore.showStatusPanel) && !showHub.value);
const showDrawerToggle = computed(() => isMdAndUp.value);
const showBackButton = computed(() => !isMdAndUp.value && !isAtHub.value);

// Directional slide between the hub (`/` below md) and a page. Set in a navigation guard so it is
// correct before the route component swaps; left empty for page-to-page and all md+ navigation,
// which keeps the router-view transition inert. Compared by top-level segment so a page redirecting
// to a default subroute (Settings -> Settings/General, Explorer -> a tab) doesn't reset the slide
const transitionName = ref("");
function topLevelPath(path: string): string {
	return "/" + (path.split("/")[1] ?? "");
}
const stopTransitionGuard = router.beforeEach((to, from) => {
	const toTop = topLevelPath(to.path);
	const fromTop = topLevelPath(from.path);
	if (toTop === fromTop) {
		return;
	}
	const canSlide = !isMdAndUp.value && menuStore.allItems.length > 0;
	if (canSlide && toTop === "/" && fromTop !== "/") {
		transitionName.value = "hub-back";
	} else if (canSlide && fromTop === "/" && toTop !== "/") {
		transitionName.value = "hub-forward";
	} else {
		transitionName.value = "";
	}
});
onUnmounted(stopTransitionGuard);

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

// Full caption without the SHORT_TITLES_MD_AND_UP substitution, used for the native title
// tooltip so a hover reveals the complete name even when the drawer shows the shortened label
function resolveItemCaption(item: MenuItem): string {
	return item.translated ? item.caption : i18n.global.t(item.caption);
}

function resolveBadge(item: MenuItem): MenuBadge | null {
	return item.badge?.() ?? null;
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
