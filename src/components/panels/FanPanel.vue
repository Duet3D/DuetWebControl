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
			<v-layout row align-start>
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

				<v-flex shrink class="pl-3">
					<v-btn large icon :disabled="!canControlFans" @click="change(-5)">
						<v-icon>remove</v-icon>
					</v-btn>
				</v-flex>

				<v-flex class="px-2">
					<v-slider :value="fanValue" @change="fanValue = $event" :min="0" :max="100" validate-on-blur :disabled="frozen" thumb-label="always"></v-slider>
				</v-flex>

				<v-flex shrink>
					<v-btn large icon :disabled="!canControlFans" @click="change(5)">
						<v-icon>add</v-icon>
					</v-btn>
				</v-flex>
			</v-layout>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

const debounceTime = 500

export default {
	computed: {
		...mapGetters('ui', ['frozen']),
		...mapGetters('machine', ['currentTool']),
		...mapState('machine', ['fans']),
		canControlFans() { return !this.frozen && this.fans.length; },
		fanValue: {
			get() {
				if (this.canControlFans) {
					if (this.debounce.value !== undefined) {
						return this.debounce.value;
					}

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
			debounce: {
				value: undefined,
				timer: undefined,
				time: undefined
			},
			fan: -1
		}
	},
	methods: {
		...mapActions(['sendCode']),
		change(diff) {
			if (this.debounce.timer) {
				this.debounce.value += diff;
				clearTimeout(this.debounce.timer);
			} else {
				this.debounce.value = this.fanValue + diff;
			}

			this.debounce.value = Math.min(100, Math.max(0, this.debounce.value));
			this.debounce.timer = setTimeout(this.doDebounce, debounceTime);
		},
		doDebounce() {
			if (!this.frozen) {
				this.fanValue = this.debounce.value;
			}
			this.debounce.timer = undefined;
		}
	},
	watch: {
		fans: {
			deep: true,
			handler() {
				if (!this.debounce.timer) {
					// If this changes we've got an update. Debounce should be complete now
					this.debounce.value = undefined;
				}
			}
		}
	}
}
</script>
