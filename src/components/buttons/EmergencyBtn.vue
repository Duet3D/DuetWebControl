<template>
	<code-btn v-bind="$props" :code="'M112\nM999'" :log="false" color="$props.color || error" :disabled="$props.disabled || isDisabled" :title="$t('button.emergencyStop.title')">
		<v-icon class="mr-1">mdi-flash</v-icon> {{ $t('button.emergencyStop.caption') }}
	</code-btn>
</template>

<script>
'use strict'

import { VBtn } from 'vuetify/lib'

export default {
	extends: VBtn,
	data() {
		return {
			isDisabled: false
		}
	},
	mounted() {
		this.$root.$on('dialog-closing', this.onDialogClosing);
	},
	beforeDestroy() {
		this.$root.$off('dialog-closing', this.onDialogClosing);
	},
	methods: {
		onDialogClosing() {
			this.isDisabled = true;

			const that = this;
			setTimeout(function() {
				that.isDisabled = false;
			}, 500);
		}
	}
}
</script>
