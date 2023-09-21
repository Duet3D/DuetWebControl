<template>
	<v-tabs v-model="tab" class="elevation-2 mt-3">
		<v-tabs-slider />

		<v-tab v-for="(tab, index) in tabs" :key="index" :href="`#general-tab-${index}`">
			<v-icon v-if="tab.icon" class="mr-1">{{ tab.icon }}</v-icon> {{ tab.translated ? tab.caption : $t(tab.caption) }}
		</v-tab>

		<v-tab-item v-for="(tab, index) in tabs" :key="index" :value="`general-tab-${index}`">
			<component :is="tab.component" />
		</v-tab-item>
	</v-tabs>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { GeneralSettingTabs } from "..";

export default defineComponent({
	data() {
		return {
			tab: "general-tab-0",
			tabs: GeneralSettingTabs
		}
	}
});
</script>
