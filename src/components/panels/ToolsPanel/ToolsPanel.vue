<!-- Side-by-side tabbed view: tools/heaters control on one tab, extra-sensor list on the other.
	 ControlAllDropdown lives in the header so its actions stay one click away regardless of tab -->
<template>
	<v-card>
		<v-card-title class="py-2 d-flex align-center">
			<PanelLink :active="showToolsPage" class="mr-2" @click="showToolsPage = true">
				<v-icon size="small">mdi-wrench</v-icon>
				{{ $t("panel.tools.caption") }}
			</PanelLink>
			<PanelLink :active="!showToolsPage" @click="showToolsPage = false">
				<v-icon size="small">mdi-plus</v-icon>
				{{ $t("panel.tools.extra.caption") }}
			</PanelLink>

			<v-spacer />

			<ControlAllDropdown />
		</v-card-title>

		<v-card-text class="pa-0">
			<ControlList v-if="showToolsPage" />
			<ExtraSensorList v-else />
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import ControlAllDropdown from "./ControlAllDropdown.vue";
import ControlList from "./ControlList/ControlList.vue";
import ExtraSensorList from "./ExtraSensorList.vue";

const showToolsPage = ref(true);
</script>
