<style scoped>
.v-btn-toggle {
	display: flex;
}
.v-btn-toggle > button {
	display: flex;
	flex: 1 1 auto;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">power</v-icon> ATX Power
		</v-card-title>

		<v-card-text class="pt-0">
			<v-btn-toggle :value="!!state.atxPower" @change="togglePower" mandatory>
				<v-btn flat :value="true" :disabled="uiFrozen" :loading="sendingCode" color="success" @click="togglePower(true)">
					On
				</v-btn>
				<v-btn flat :value="false" :disabled="uiFrozen" :loading="sendingCode" color="error" @click="togglePower(false)">
					Off
				</v-btn>
			</v-btn-toggle>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', ['state'])
	},
	data() {
		return {
			sendingCode: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		async togglePower(state) {
			if (!this.sendingCode) {
				this.sendingCode = true;
				try {
					await this.sendCode(state ? 'M80' : 'M81');
				} catch (e) {
					// handled before we get here
				}
				this.sendingCode = false;
			}
		}
	}
}
</script>
