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
	<v-card v-show="canControlFans">
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-fan</v-icon> {{ $t('panel.fan.caption') }}
		</v-card-title>

		<v-card-text class="py-0">
			<v-row align="start">
				<v-col cols="12" sm="auto" order="1" order-sm="0">
					<p class="mb-1">
						{{ $t('panel.fan.selection') }}
					</p>
					<v-btn-toggle v-model="fan" mandatory>
						<v-btn v-if="currentTool && currentTool.fans.length > 0" :value="-1">
							{{ $t('panel.fan.toolFan') }}
						</v-btn>

						<v-btn v-for="(fan, index) in fans.filter(fan => !fan.thermostatic.control)" :key="index" :value="index" :disabled="uiFrozen">
							{{ fan.name ? fan.name : $t('panel.fan.fan', [index]) }}
						</v-btn>
					</v-btn-toggle>
				</v-col>

				<v-col cols="12" sm="auto" order="0" order-sm="1" class="flex-sm-grow-1">
					<slider v-model="fanValue" :disabled="uiFrozen"></slider>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapState('machine/model', ['fans', 'tools']),
		...mapGetters(['uiFrozen']),
		...mapGetters('machine/model', ['currentTool']),
		canControlFans() {
			return !this.uiFrozen && ((this.currentTool && this.currentTool.fans.length > 0) || (this.fans.some(fan => fan && !fan.thermostatic.control)));
		},
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
					if (this.fan < this.fans.length && this.fans[this.fan]) {
						return Math.round(this.fans[this.fan].value * 100);
					}
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
		...mapActions('machine', ['sendCode']),
		updateFanSelection() {
			if (this.fan === -1) {
				if (!this.currentTool) {
					this.fan = this.fans.findIndex(fan => fan && !fan.thermostatic.control);
				}
			} else if (this.fan >= this.fans.length || (this.fan !== -1 && this.fans[this.fan] && this.fans[this.fan].thermostatic.control)) {
				if (this.currentTool) {
					this.fan = -1;
				} else {
					this.fan = this.fans.findIndex(fan => fan && !fan.thermostatic.control);
				}
			}
		}
	},
	mounted() {
		this.updateFanSelection();
	},
	watch: {
		currentTool() {
			this.updateFanSelection();
		},
		fans: {
			deep: true,
			handler() {
				this.updateFanSelection();
			}
		}
	}
}
</script>
