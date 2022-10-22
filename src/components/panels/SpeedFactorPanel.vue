<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-timer</v-icon>
			{{ $t("panel.speedFactor.caption") }}

			<v-spacer />

			<a v-show="speedFactor !== 100 && !uiFrozen" href="javascript:void(0)"
			   @click.prevent="sendCode('M220 S100')" class="subtitle-2">
				<v-icon small class="mr-1">mdi-backup-restore</v-icon>
				{{ $t("generic.reset") }}
			</a>
		</v-card-title>

		<v-card-text class="py-0">
			<percentage-input v-model="speedFactor" :min="speedFactorMin" :max="speedFactorMax" :disabled="uiFrozen" />
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		speedFactor: {
			get(): number { return (store.state.machine.model.move.speedFactor !== null) ? (store.state.machine.model.move.speedFactor * 100) : 100; },
			set(value: number) { this.sendCode(`M220 S${value}`); }
		},
		speedFactorMin(): number { return Math.max(1, Math.min(100, this.speedFactor - 50)); },
		speedFactorMax(): number { return Math.max(150, this.speedFactor + 50); }
	},
	methods: {
		async sendCode(code: string) {
			await store.dispatch("machine/sendCode", code);
		}
	}
});
</script>
