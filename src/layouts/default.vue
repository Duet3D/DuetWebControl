<!-- Default DWC shell: app bar + navigation drawer (md+) or hub-page model (xs/sm) -->
<!-- Ported from v3.7-dev `src/App.vue` to Vue 3 / Vuetify 4 / Pinia for the next-branch modernization -->
<template>
	<v-app>
		<v-app-bar :elevation="2">
			<v-app-bar-nav-icon v-if="showDrawerToggle" @click="drawer = !drawer" />
			<v-btn v-else-if="showBackButton" icon="mdi-arrow-left" variant="text"
				   :aria-label="$t('layout.backToHub')" @click="goHub" />

			<v-app-bar-title class="px-1">
				<a id="title" href="javascript:void(0)" class="text-decoration-none text-inherit">
					{{ machineName }}
				</a>
			</v-app-bar-title>

			<ConnectButton v-if="showConnectButton && isMdAndUp" class="ms-3" />

			<v-spacer />

			<CodeInput v-if="isMdAndUp" grow class="mx-3" />

			<v-spacer />

			<!-- UploadButton lands here in 3.5 (with the Jobs page); needs the full target/dialog machinery -->

			<EmergencyButton />
		</v-app-bar>

		<v-navigation-drawer v-if="isMdAndUp" v-model="drawer"
							 :rail="settingsStore.iconMenu" :expand-on-hover="settingsStore.iconMenu">
			<v-list nav v-model:opened="openedCategories">
				<v-list-group v-for="category in menuStore.visibleCategories" :key="category.key"
							  :value="category.key">
					<template #activator="{ props }">
						<v-list-item v-bind="props" :prepend-icon="category.icon"
									 :title="$t(category.captionKey)" />
					</template>
					<v-list-item v-for="item in menuStore.itemsByCategory(category.key)" :key="item.path"
								 :to="item.path" :prepend-icon="item.icon"
								 :title="item.translated ? item.caption : $t(item.caption)" />
				</v-list-group>
			</v-list>
		</v-navigation-drawer>

		<v-main>
			<template v-if="showHub">
				<v-container class="pa-4">
					<v-row dense>
						<v-col v-for="item in menuStore.allItems" :key="item.path" cols="6">
							<v-card :to="item.path" min-height="140"
									class="d-flex flex-column align-center justify-center pa-6 h-100">
								<v-icon :icon="item.icon" size="48" class="mb-3" />
								<span class="text-h6 text-center">
									{{ item.translated ? item.caption : $t(item.caption) }}
								</span>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</template>
			<template v-else>
				<!-- Persistent global status panel - md+ only; xs/sm gets the dedicated Status page instead -->
				<v-container v-if="isMdAndUp" fluid class="pb-0">
					<FFFContainerPanel v-if="uiStore.isFFF" />
					<CNCContainerPanel v-else />
				</v-container>
				<v-divider v-if="isMdAndUp" />

				<v-container fluid>
					<router-view />
				</v-container>
			</template>
		</v-main>

		<ConnectDialog />
		<ConnectionProgressDialog />
		<MessageBoxDialog />
		<NotificationDisplay />
	</v-app>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import { useMachineStore } from "@/stores/machine";
import { useMenuStore } from "@/stores/menu";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const menuStore = useMenuStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const route = useRoute();
const router = useRouter();

const { mdAndUp, lgAndUp } = useDisplay();
const isMdAndUp = mdAndUp;

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
const showDrawerToggle = computed(() => isMdAndUp.value);
const showBackButton = computed(() => !isMdAndUp.value && !isAtHub.value);
// Only show the hub when there is at least one tile to render; otherwise the placeholder route content renders normally
const showHub = computed(() => !isMdAndUp.value && isAtHub.value && menuStore.allItems.length > 0);

// Auto-expand newly-visible categories without clobbering manual collapses by the user
const openedCategories = ref<Array<string>>([]);
watch(() => menuStore.visibleCategories, (categories) => {
	for (const category of categories) {
		if (!openedCategories.value.includes(category.key)) {
			openedCategories.value.push(category.key);
		}
	}
}, { immediate: true, deep: true });

function goHub() {
	router.push("/");
}
</script>
