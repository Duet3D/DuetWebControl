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
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">ac_unit</v-icon> Fan Control
		</v-card-title>

		<v-layout row wrap align-start class="px-3 py-1">
			<v-flex order-sm2 order-md1 class="ma-1">
				<p class="mb-1">Fan selection:</p>
				<v-btn-toggle v-model="fan" mandatory>
					<v-btn flat :value="-1" :disabled="!canControlFans" color="primary">
						Tool Fan
					</v-btn>
					<template v-for="(fan, index) in fans">
						<v-btn flat v-if="!fan.thermostatic.control" :key="index" :value="index" :disabled="uiFrozen" color="primary">
							{{ fan.name ? fan.name : `Fan ${index}` }}
						</v-btn>
					</template>
				</v-btn-toggle>
			</v-flex>

			<v-flex order-sm1 order-md2 class="ma-1">
				<slider v-model="fanValue" :disabled="!canControlFans"></slider>
			</v-flex>
		</v-layout>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', ['fans']),
		...mapGetters('machine/model', ['currentTool']),
		canControlFans() { return !this.uiFrozen && this.fans.length; },
		fanValue: {
			get() {
				if (this.canControlFans) {
					if (this.fan === -1) {
						let toolFan = 0;
						if (this.currentTool && this.currentTool.fans.length) {
							// Even though RRF allows multiple fans to be assigned to a tool,
							// we assume they all share the same fan value if such a config is set
							toolFan = this.currentTool.fans[0];
						}
						return Math.round(this.fans[toolFan].value * 100);
					}
					return Math.round(this.fans[this.fan].value * 100);
				}
				return 0;
			},
			set(value) {
				value = Math.min(100, Math.max(0, value)) / 100;
				if (this.fan === -1) {
					this.sendCode(`M106 S${value.toFixed(2)}`);
				} else {
					this.sendCode(`M106 P${this.fan} S${value.toFixed(2)}`);
				}
			}
		}
	},
	data() {
		return {
			fan: -1
		}
	},
	methods: mapActions('machine', ['sendCode'])
}
</script>
