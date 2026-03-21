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

			<v-spacer />
			<!-- Phase 3 will port from v3.7-dev: ConnectButton (dev), CodeInput (md+), UploadButton (md+), EmergencyButton -->
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
			<router-view v-else />
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

const machineStore = useMachineStore();
const menuStore = useMenuStore();
const settingsStore = useSettingsStore();

const route = useRoute();
const router = useRouter();

const { mdAndUp, smAndDown, lgAndUp } = useDisplay();
const isMdAndUp = mdAndUp;
const isSmAndDown = smAndDown;

const drawer = ref(lgAndUp.value);

const machineName = computed(() => machineStore.model.network.name || "Duet Web Control");

const isAtHub = computed(() => route.path === "/");
const showDrawerToggle = computed(() => isMdAndUp.value);
const showBackButton = computed(() => isSmAndDown.value && !isAtHub.value);
// Only show the hub when there is at least one tile to render; otherwise the placeholder route content renders normally
const showHub = computed(() => isSmAndDown.value && isAtHub.value && menuStore.allItems.length > 0);

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
