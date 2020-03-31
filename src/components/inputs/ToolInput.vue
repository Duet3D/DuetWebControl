<style scoped>
.tool-input {
	min-width: 5rem;
}
</style>

<template>
	<v-combobox ref="input" type="number" min="-273" max="1999" step="any" class="tool-input" :label="label"
				v-model.number="value" @keyup.enter="apply" :loading="applying" :disabled="uiFrozen || !isValid"
				:items="items" @change="change" hide-selected @blur="value = actualValue">
	</v-combobox>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', ['heat', 'tools']),
		...mapState('machine/settings', ['spindleRPM', 'temperatures']),
		...mapState('settings', ['disableAutoComplete']),
		items() {
			if (this.disableAutoComplete) {
				return [];
			}
			
			const key = this.active ? 'active' : 'standby';
			if (this.tool || this.all) {
				return this.temperatures.tool[key];
			}
			if (this.bed) {
				return this.temperatures.bed[key];
			}
			if (this.chamber) {
				return this.temperatures.chamber;
			}
			if (this.spindle) {
				return this.spindleRPM;
			}

			console.warn('[tool-input] Failed to retrieve temperature presets');
			return [];
		},
		isValid() {
			if (this.all || this.spindle) {
				return true;
			} else if (this.tool && this.toolHeaterIndex >= 0 && this.toolHeaterIndex < this.tool.heaters.length) {
				const heater = this.tool.heaters[this.toolHeaterIndex];
				return (heater >= 0 && heater < this.heat.heaters.length && this.heat.heaters[heater] !== null);
			} else if (this.bed && this.bedIndex >= 0 && this.bedIndex < this.heat.heaters.length) {
				return (this.heat.heaters[this.bedIndex] !== null);
			} else if (this.chamber && this.chamberIndex >= 0 && this.chamberIndex < this.heat.heaters.length) {
				return (this.heat.heaters[this.chamberIndex] !== null);
			}
			return false;
		}
	},
	data() {
		return {
			applying: false,
			input: null,
			actualValue: 0,
			value: 0
		}
	},
	props: {
		label: String,

		all: Boolean,
		active: Boolean,
		standby: Boolean,

		tool: Object,
		toolHeaterIndex: Number,

		spindle: Object,
		spindleIndex: Number,

		bed: Object,
		bedIndex: Number,

		chamber: Object,
		chamberIndex: Number
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		async apply() {
			this.$refs.input.isMenuActive = false;			// FIXME There must be a better solution than this

			if (!this.isNumber(this.value)) {
				this.$makeNotification('warning', this.$t('error.enterValidNumber'));
				return;
			}

			if (!this.applying) {
				this.applying = true;
				try {
					if (this.spindle) {
						// Set Spindle RPM
						if (this.value >= 0) {
							this.sendCode(`M3 P${this.spindleIndex} S${this.value}`);
						} else {
							this.sendCode(`M4 P${this.spindleIndex} S${-this.value}`);
						}
					} else if (this.value >= -273.15 && this.value <= 1999) {
						if (this.tool) {
							// Set tool temps
							const currentTemps = this.tool[this.active ? 'active' : 'standby'];
							const newTemps = currentTemps.map((temp, i) => (i === this.toolHeaterIndex) ? this.value : temp, this).join(':');
							await this.sendCode(`G10 P${this.tool.number} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.bed) {
							// Set bed temp
							await this.sendCode(`M140 P${this.bedIndex} ${this.active ? 'S' : 'R'}${this.value}`);
						} else if (this.chamber) {
							// Set chamber temp
							await this.sendCode(`M141 P${this.chamberIndex} ${this.active ? 'S' : 'R'}${this.value}`);
						} else if (this.all) {
							// Set all temps
							let code = '';
							this.tools.forEach(function(tool) {
								if (tool.heaters.length) {
									const temps = tool.heaters.map(() => this.value, this).join(':');
									code += `G10 P${tool.number} ${this.active ? 'S' : 'R'}${temps}\n`;
								}
							}, this);
							this.heat.bedHeaters.forEach(function(bedHeater, bedIndex) {
								if (bedHeater >= 0 && bedHeater <= this.heat.heaters.length) {
									code += `M140 P${bedIndex} ${this.active ? 'S' : 'R'}${this.value}\n`;
								}
							}, this);
							this.heat.chamberHeaters.forEach(function(chamberHeater, chamberIndex) {
								if (chamberHeater >= 0 && chamberHeater <= this.heat.heaters.length) {
									code += `M141 P${chamberIndex} ${this.active ? 'S' : 'R'}${this.value}\n`;
								}
							}, this);
							await this.sendCode(code);
							this.actualValue = this.value;
						} else {
							console.warn('[tool-input] Invalid target for tool-input');
						}
					}
				} catch (e) {
					// should be handled before we get here
					console.warn(e);
				}
				this.applying = false;
			}
		},
		async change(value) {
			// Note that value is of type String when a user enters a value and then leaves it without confirming...
			if (typeof value === 'number') {
				await this.apply();
			}
		}
	},
	mounted() {
		this.input = this.$el.querySelector('input');
		if (this.tool) {
			this.value = this.tool[this.active ? 'active' : 'standby'][this.toolHeaterIndex];
		} else if (this.bed) {
			this.value = this.bed[this.active ? 'active' : 'standby'];
		} else if (this.chamber) {
			this.value = this.chamber[this.active ? 'active' : 'standby'];
		} else if (this.spindle) {
			this.value = this.spindle.active;
		}
		this.actualValue = this.value;
	},
	watch: {
		'tool.active'(to) {
			const val = (to instanceof Array) ? to[this.toolHeaterIndex] : to;
			if (this.active && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = val;
				}
			}
		},
		'tool.standby'(to) {
			const val = (to instanceof Array) ? to[this.toolHeaterIndex] : to;
			if (this.standby && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = val;
				}
			}
		},
		'bed.active'(to) {
			if (this.active && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.input) {
					this.value = to;
				}
			}
		},
		'bed.standby'(to) {
			if (this.standby && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.input) {
					this.value = to;
				}
			}
		},
		'chamber.active'(to) {
			if (this.active && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.input) {
					this.value = to;
				}
			}
		},
		'chamber.standby'(to) {
			if (this.standby && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.input) {
					this.value = to;
				}
			}
		},
		'spindle.active'(to) {
			if (this.active && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.input) {
					this.value = to;
				}
			}
		}
	}
}
</script>
