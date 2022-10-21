<template>
	<v-row :dense="$vuetify.breakpoint.mobile">
		<v-col cols="12" class="pt-1">
			<code-input solo />
		</v-col>
		<v-col cols="12">
			<event-list />
		</v-col>
	</v-row>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	activated() {
		store.commit("hideCodeReplyNotifications");
	},
	deactivated() {
		store.commit("showCodeReplyNotifications");
	}
});
</script>
