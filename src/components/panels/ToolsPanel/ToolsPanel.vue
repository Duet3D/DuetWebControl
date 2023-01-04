<template>
	<v-card>
		<v-card-title class="py-2">
			<panel-link :active="showToolsPage" @click="showToolsPage = true" class="mr-2">
				<v-icon small>mdi-wrench</v-icon>
				{{ $t("panel.tools.caption") }}
			</panel-link>
			<panel-link :active="!showToolsPage" @click="showToolsPage = false">
				<v-icon small>mdi-plus</v-icon>
				{{ $t("panel.tools.extra.caption") }}
			</panel-link>

			<v-spacer />

			<control-all-dropdown />
		</v-card-title>

		<v-card-text class="pa-0">
			<control-list v-if="showToolsPage" />
			<extra-sensor-list v-else />
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { ref } from "vue";

import ControlAllDropdown from "./ControlAllDropdown.vue";
import ControlList from "./ControlList/ControlList.vue";
import ExtraSensorList from "./ExtraSensorList.vue";

const showToolsPage = ref(true);
</script>
