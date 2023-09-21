<template>
	<code-btn v-bind="$props" :code="'M112\nM999'" :log="false" :color="color || 'error'"
			  :disabled="disabled || isDisabled" :title="$t('button.emergencyStop.title')">
		<v-icon class="mr-1">mdi-flash</v-icon>
		<span class="hidden-xs-only">
			{{ $t('button.emergencyStop.caption') }}
		</span>
	</code-btn>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "pinia";

import { useUiStore } from "@/store/ui";

export default defineComponent({
	props: {
		color: String,
		disabled: Boolean
	},
	computed: mapState(useUiStore, ["dialogOpen"]),
	data() {
		return {
			isDisabled: false
		}
	},
	watch: {
		dialogOpen(to) {
			if (!to) {
				this.isDisabled = true;

				const that = this;
				setTimeout(function () {
					that.isDisabled = false;
				}, 500);
			}
		}
	}
});
</script>
