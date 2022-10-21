<template>
	<v-tabs v-model="tab" class="elevation-2 mt-3">
		<v-tabs-slider />

		<v-tab v-for="(tab, index) in tabs" :key="index" :href="`#general-tab-${index}`">
			{{ tab.translated ? tab.caption : $t(tab.caption) }}
		</v-tab>

		<v-tab-item v-for="(tab, index) in tabs" :key="index" :value="`general-tab-${index}`">
			<component :is="tab.component" />
		</v-tab-item>
	</v-tabs>
</template>

<script lang="ts">
import Vue from "vue";

import { GeneralSettingTabs } from "..";

export default Vue.extend({
	data() {
		return {
			tab: "general-tab-0",
			tabs: GeneralSettingTabs
		}
	}
});
</script>
