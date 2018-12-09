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
	<v-card v-auto-size>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">opacity</v-icon> Extrusion Control
		</v-card-title>

		<v-card-text class="px-3 pt-0 pb-2">
			<v-layout row align-center>
				<v-flex>
					<v-layout row wrap>
						<v-flex v-if="currentTool && currentTool.extruders.length > 1" class="pr-3">
							<p class="mb-1">Mix ratio:</p>
							<v-btn-toggle v-model="mix" mandatory multiple>
								<v-btn flat value="mix":disabled="frozen" color="primary">
									Mix
								</v-btn>
								<v-btn flat v-for="extruder in currentTool.extruders" :key="extruder" :value="extruder":disabled="frozen" color="primary">
									{{ `E${extruder}` }}
								</v-btn>
							</v-btn-toggle>
						</v-flex>
						<v-flex class="pr-3">
							<p class="my-1">Feed amount in mm:</p>
							<v-btn-toggle v-model="amount" mandatory>
								<v-btn flat v-for="(amount, index) in machineUI.extruderAmounts" :key="index" :value="amount" :disabled="frozen" color="primary">
									{{ amount }}
								</v-btn>
							</v-btn-toggle>
						</v-flex>
						<v-flex class="pr-3">
							<p class="my-1">Feedrate in mm/s:</p>
							<v-btn-toggle v-model="feedrate" mandatory>
								<v-btn flat v-for="(feedrate, index) in machineUI.extruderFeedrates" :key="index" :value="feedrate" :disabled="frozen" color="primary">
									{{ feedrate }}
								</v-btn>
							</v-btn-toggle>
						</v-flex>
					</v-layout>
				</v-flex>
				<v-flex shrink>
					<v-btn block :disabled="frozen || !canRetract" :loading="busy" @click="buttonClicked(false)">
						<v-icon>arrow_upward</v-icon> Retract
					</v-btn>
					<v-btn block :disabled="frozen || !canExtrude" :loading="busy" @click="buttonClicked(true)">
						<v-icon>arrow_downward</v-icon> Extrude
					</v-btn>
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
		...mapState('machine', ['heat', 'tools']),
		...mapGetters('machine', ['currentTool']),
		...mapGetters('ui', ['frozen', 'machineUI']),
		canExtrude() {
			if (this.currentTool && this.currentTool.heaters.length) {
				const selectedHeaters = (this.mixValue[0] === 'mix') ? this.currentTool.heaters : this.mixValue;
				const heaters = this.heat.heaters, minTemp = this.heat.coldExtrudeTemperature;
				return !selectedHeaters.some(heater => heaters[heater].current < minTemp);
			}
			return false;
		},
		canRetract() {
			if (this.currentTool && this.currentTool.heaters.length) {
				const selectedHeaters = (this.mixValue[0] === 'mix') ? this.currentTool.heaters : this.mixValue;
				const heaters = this.heat.heaters, minTemp = this.heat.coldRetractTemperature;
				return !selectedHeaters.some(heater => heaters[heater].current < minTemp);
			}
			return false;
		},
		mix: {
			get() {
				return this.mixValue;
			},
			set(value) {
				if (value.length > 1) {
					if (this.mixValue.indexOf('mix') !== value.indexOf('mix')) {
						// Mix is being toggled
						if (value.indexOf('mix') !== -1) {
							this.mixValue = ['mix'];
						} else {
							this.mixValue = value.filter(item => item !== 'mix');
						}
					} else {
						// Selecting another E drive
						this.mixValue = value.filter(item => item !== 'mix');
					}
				} else {
					// One value - OK
					this.mixValue = value;
				}
			}
		}
	},
	data() {
		return {
			busy: false,
			mixValue: ['mix'],
			amount: 0,
			feedrate: 0
		}
	},
	methods: {
		...mapActions(['sendCode']),
		async buttonClicked(extrude) {
			if (!this.currentTool.extruders.length) {
				return;
			}

			let amounts;
			if (this.mix.length === 1 && this.mix[0] === 'mix') {
				// Split total amount to extrude evenly
				amounts = [this.amount];
			} else {
				// Extrude given amount via each selected extruder drive
				amounts = this.currentTool.extruders.map(extruder => (this.mix.indexOf(extruder) !== -1) ? this.amount : 0);
			}

			this.busy = true;
			try {
				const amount = amounts.map(amount => extrude ? amount : -amount).reduce((a, b) => `${a}:${b}`);
				// TODO let users decide if they want to send M400 as well so this call blocks until the extrusion is complete
				await this.sendCode(`G1 E${amount} F${this.feedrate * 60}`);
			} catch (e) {
				// handled before we get here
			}
			this.busy = false;
		}
	},
	mounted() {
		this.amount = this.machineUI.extruderAmounts[0];
		this.feedrate = this.machineUI.extruderFeedrates[0];
	},
	watch: {
		currentTool(to) {
			if (!to || to.extruders.length <= 1) {
				// Switch back to mixing mode if the selection panel is hidden
				this.mix = ['mix'];
			}
		}
	}
}
</script>
