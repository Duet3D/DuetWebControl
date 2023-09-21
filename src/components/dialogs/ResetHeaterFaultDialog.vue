<template>
	<v-dialog v-model="shown" max-width="360">
		<v-card>
			<v-card-title class="headline">
				<v-icon class="mr-1">mdi-alert</v-icon> {{ $t("dialog.resetHeaterFault.title") }}
			</v-card-title>

			<v-card-text>
				{{ $t("dialog.resetHeaterFault.prompt", [heater]) }}
			</v-card-text>

			<v-card-actions>
				<v-spacer />

				<v-btn color="blue darken-1" variant="text" :disabled="!!counter" @click="resetFault">
					{{ $t("dialog.resetHeaterFault.resetFault") + (counter ? ` (${counter})` : "") }}
				</v-btn>

				<v-btn color="blue darken-1" variant="text" @click="hide">
					{{ $t("generic.cancel") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { useMachineStore } from "@/store/machine";

/**
 * How long to wait before a user can reset a heater fault (in s)
 */
const countdownSeconds = 5;

export default defineComponent({
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		heater: {
			type: Number,
			required: true
		}
	},
	data() {
		return {
			counter: countdownSeconds,
			resetHeaters: new Array<number>(),
			timer: null as NodeJS.Timeout | null
		}
	},
	methods: {
		async resetFault() {
			const machineStore = useMachineStore();
			try {
				await machineStore.sendCode(`M562 P${this.heater}`);
				this.resetHeaters.push(this.heater);
			} finally {
				this.hide();
			}
		},
		hide() {
			this.$emit("update:shown", false);
		},
		countDown() {
			this.counter--;
			this.timer = (this.counter > 0) ? setTimeout(this.countDown.bind(this), 1000) : null;
		}
	},
	watch: {
		shown(to: boolean) {
			if (to) {
				if (!this.timer && !this.resetHeaters.includes(this.heater)) {
					this.counter = countdownSeconds;
					this.countDown();
				}
			} else if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		}
	}
});
</script>
