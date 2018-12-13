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
			<v-icon small class="mr-1">ac_unit</v-icon> Fan Control
		</v-card-title>

		<v-card-text class="px-3 pt-0 pb-2">
			<v-layout row wrap align-start>
				<v-flex>
					<p class="mb-1">Fan selection:</p>
					<v-btn-toggle v-model="fan" mandatory>
						<v-btn flat :value="-1" :disabled="!canControlFans" color="primary">
							Tool Fan
						</v-btn>
						<template v-for="(fan, index) in fans">
							<v-btn flat v-if="!fan.thermostatic.control" :key="index" :value="index":disabled="frozen" color="primary">
								{{ fan.name ? fan.name : `Fan ${index}` }}
							</v-btn>
						</template>
					</v-btn-toggle>
				</v-flex>

				<v-flex>
					<slider v-model="fanValue" :disabled="!canControlFans"></slider>
				</v-flex>
			</v-layout>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters('ui', ['frozen']),
		...mapGetters('machine', ['currentTool']),
		...mapState('machine', ['fans']),
		canControlFans() { return !this.frozen && this.fans.length; },
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
						return this.fans[toolFan].value * 100;
					}
					return this.fans[this.fan].value * 100;
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
	methods: {
		...mapActions(['sendCode'])
	}
}
</script>