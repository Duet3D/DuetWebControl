<style scoped>
.v-btn-toggle {
	display: flex;
}

.v-btn-toggle>button {
	display: flex;
	flex: 1 1 auto;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">mdi-power</v-icon> {{ $t('panel.atx.caption') }}
		</v-card-title>

		<v-card-text class="pt-0">
			<v-btn-toggle :value="atxPower" @change="toggleAtxPower" mandatory>
				<v-btn text :value="true" :disabled="uiFrozen" :loading="sendingCode" @click="toggleAtxPower(true)">
					{{ $t('panel.atx.on') }}
				</v-btn>
				<v-btn text :value="false" :disabled="uiFrozen" :loading="sendingCode" @click="toggleAtxPower(false)">
					{{ $t('panel.atx.off') }}
				</v-btn>
			</v-btn-toggle>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		atxPower(): boolean | null { return store.state.machine.model.state.atxPower; }
	},
	data() {
		return {
			sendingCode: false
		}
	},
	methods: {
		async toggleAtxPower(value: boolean) {
			if (!this.sendingCode) {
				this.sendingCode = true;
				try {
					await store.dispatch("machine/sendCode", value ? "M80" : "M81");
				} catch (e) {
					// handled before we get here
				}
				this.sendingCode = false;
			}
		}
	}
});
</script>
