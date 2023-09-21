<template>
	<v-btn v-bind="$props" :disabled="$props.disabled || uiFrozen" :elevation="1" :loading="waitingForCode"
		   @click="click" @contextmenu="$emit('contextmenu', $event)">
		<slot></slot>
	</v-btn>
</template>

<script lang="ts">
import { mapState } from "pinia";
import { VBtn } from "vuetify/components/VBtn";

import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";
import { defineComponent } from "vue";

export default defineComponent({
	extends: VBtn,
	props: {
		code: {
			type: String,
			required: true
		},
		disabled: Boolean,
		log: {
			type: Boolean,
			default: true
		},
		noWait: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		...mapState(useUiStore, ["uiFrozen"])
	},
	data() {
		return {
			waitingForCode: false
		}
	},
	methods: {
		async click() {
			try {
				const machineStore = useMachineStore();
				if (this.noWait) {
					// Run the requested code but don't wait for a result
					await machineStore.sendCode(this.code, false, this.log, true);
				} else {
					// Wait for the code to complete and block while doing so
					this.waitingForCode = true;
					try {
						await machineStore.sendCode(this.code, false, this.log);
					} finally {
						this.waitingForCode = false;
					}
				}
			} catch (e) {
				// handled before we get here
			}
		}
	}
});
</script>
