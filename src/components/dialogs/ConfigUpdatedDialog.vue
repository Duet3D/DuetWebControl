<template>
	<v-dialog :value="shown" @input="$emit('shown', $event)" @keydown.escape="$emit('shown', $event)" persistent
			  width="720">
		<v-card>
			<v-card-title>
				<span class="headline">
					{{ $t("dialog.configUpdated.title") }}
				</span>
			</v-card-title>

			<v-card-text>
				{{ $t("dialog.configUpdated.prompt") }}
			</v-card-text>

			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn color="blue darken-1" text @click="cancel">{{ $t("generic.cancel") }}</v-btn>
				<v-btn color="blue darken-1" text @click="reset">{{ $t("dialog.configUpdated.reset") }}</v-btn>
				<v-btn color="blue darken-1" text @click="runConfig">{{ $t("dialog.configUpdated.runConfig") }}</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	props: {
		shown: {
			type: Boolean,
			required: true
		}
	},
	methods: {
		cancel() {
			this.$emit("update:shown", false);
		},
		async reset() {
			this.$emit("update:shown", false);
			await store.dispatch("machine/sendCode", "M999");
		},
		async runConfig() {
			this.$emit("update:shown", false);
			await store.dispatch("machine/sendCode", "M98 P\"config.g\"");
		}
	}
});
</script>
