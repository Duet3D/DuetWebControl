<route lang="json">
{
	"meta": {
		"menu": {
			"category": "control",
			"icon": "mdi-view-dashboard",
			"caption": "menu.control.dashboard",
			"order": 10
		}
	}
}
</route>

<template>
	<HubTiles v-if="showHub" />
	<DashboardContent v-else />
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";

import HubTiles from "@/components/misc/HubTiles.vue";
import DashboardContent from "@/components/panels/DashboardContent.vue";
import { useMenuStore } from "@/stores/menu";

const { mdAndUp } = useDisplay();
const menuStore = useMenuStore();

// Below md the dashboard route doubles as the navigation hub - a grid of tiles to every page.
// md+ navigates through the drawer, so it shows the dashboard panels directly. Rendering the hub
// as this route's content (rather than a layout overlay) lets the router-view slide transition
// animate the hub and the destination page together on Back/Forward
const showHub = computed(() => !mdAndUp.value && menuStore.allItems.length > 0);
</script>
