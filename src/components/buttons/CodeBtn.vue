<template>
	<v-btn v-bind="$props" :disabled="$props.disabled || uiFrozen" :elevation="1" :loading="waitingForCode"
		   @click="click" @contextmenu="$emit('contextmenu', $event)">
		<slot></slot>
	</v-btn>
</template>

<script lang="ts">
import Vue from "vue";
import { VBtn } from "vuetify/lib";

import store from "@/store";

export default Vue.extend({
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
		uiFrozen(): boolean { return store.getters["uiFrozen"]; }
	},
	data() {
		return {
			waitingForCode: false
		}
	},
	methods: {
		async click() {
			try {
				if (this.noWait) {
					// Run the requested code but don't wait for a result
					await store.dispatch("machine/sendCode", {
						code: this.code,
						log: this.log,
						noWait: true
					});
				} else {
					// Wait for the code to complete and block while doing so
					this.waitingForCode = true;
					try {
						await store.dispatch("machine/sendCode", {
							code: this.code,
							log: this.log
						});
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
