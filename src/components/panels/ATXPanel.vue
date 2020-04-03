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
			<v-icon small class="mr-1">mdi-power</v-icon> {{ $t('panel.atx.caption') }}
		</v-card-title>

		<v-card-text class="pt-0">
			<v-btn-toggle :value="state.atxPower" @change="togglePower" mandatory>
				<v-btn text :value="true" :disabled="uiFrozen" :loading="sendingCode" @click="togglePower(true)">
					{{ $t('panel.atx.on') }}
				</v-btn>
				<v-btn text :value="false" :disabled="uiFrozen" :loading="sendingCode" @click="togglePower(false)">
					{{ $t('panel.atx.off') }}
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
