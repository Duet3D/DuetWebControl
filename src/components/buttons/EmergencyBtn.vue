<template>
	<code-btn v-bind="$props" :code="'M112\nM999'" :log="false" :color="color || 'error'"
			  :disabled="$props.disabled || isDisabled" :title="$t('button.emergencyStop.title')">
		<v-icon class="mr-1">mdi-flash</v-icon>
		<span class="hidden-xs-only">
			{{ $t('button.emergencyStop.caption') }}
		</span>
	</code-btn>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	props: {
		color: String
	},
	data() {
		return {
			isDisabled: false
		}
	},
	mounted() {
		this.$root.$on("dialog-closing", this.onDialogClosing);
	},
	beforeDestroy() {
		this.$root.$off("dialog-closing", this.onDialogClosing);
	},
	methods: {
		onDialogClosing() {
			this.isDisabled = true;

			const that = this;
			setTimeout(function () {
				that.isDisabled = false;
			}, 500);
		}
	}
});
</script>
