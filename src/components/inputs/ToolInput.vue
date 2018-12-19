<template>
	<v-combobox ref="input" type="number" min="-273" max="1999" step="any" v-model.number="value" :items="items" @keyup.enter="apply" @change="change" @blur="blur" :loading="applying" :disabled="uiFrozen" menu-props="auto, overflowY">
	</v-combobox>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', ['heat']),
		...mapState('machine/settings', ['spindleRPM', 'temperatures']),
		items() {
			const key = this.active ? 'active' : 'standby';
			if (this.tool || this.all) {
				return this.temperatures.tool[key];
			}
			if (this.bed) {
				return this.temperatures.bed[key];
			}
			if (this.chamer) {
				return this.temperatures.chamber[key];
			}
			if (this.spindle) {
				return this.spindleRPM;
			}

			console.warn('[tool-input] Failed to retrieve temperature presets');
			return [];
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
		active: Boolean,
		standby: Boolean,

		all: Boolean,
		heaterIndex: Number,
		tool: Object,
		bed: Object,
		bedIndex: Number,
		chamber: Object,
		chamberIndex: Number,

		spindle: Object,
		spindleIndex: Number
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		async apply() {
			this.$refs.input.isMenuActive = false;			// FIXME There must be a better solution than this

			if (!this.applying && this.isNumber(this.value)) {
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
							// Set tool temp
							const currentTemps = this.tool[this.active ? 'active' : 'standby'];
							const value = this.value, heaterIndex = this.heaterIndex;
							const newTemps = currentTemps.map((temp, i) => (i === heaterIndex) ? value : temp).reduce((a, b) => `${a}:${b}`);
							await this.sendCode(`G10 P${this.tool.number} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.bed) {
							// Set bed temp
							const currentTemps = this.bed[this.active ? 'active' : 'standby'];
							const value = this.value, heaterIndex = this.heaterIndex;
							const newTemps = currentTemps.map((temp, i) => (i === heaterIndex) ? value : temp).reduce((a, b) => `${a}:${b}`);
							await this.sendCode(`M140 P${this.bedIndex} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.chamber) {
							// Set chamber tem
							const currentTemps = this.chamber[this.active ? 'active' : 'standby'];
							const value = this.value, heaterIndex = this.heaterIndex;
							const newTemps = currentTemps.map((temp, i) => (i === heaterIndex) ? value : temp).reduce((a, b) => `${a}:${b}`);
							await this.sendCode(`M141 P${this.chamberIndex} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.all) {
							// Set all temps
							let code = '';
							const targetTemp = this.value;
							this.tools.forEach(function(tool) {
								if (tool.heaters.length) {
									const temps = tool.heaters.map(() => targetTemp).reduce((a, b) => a + ':' + b);
									code += `G10 P${tool.number} ${this.active ? 'S' : 'R'}${temps}\n`;
								}
							}, this);
							this.heat.beds.forEach(function(bed, index) {
								if (bed && bed.heaters.length) {
									const temps = bed.heaters.map(() => targetTemp).reduce((a, b) => a + ':' + b);
									code += `M140 P${index} ${this.active ? 'S' : 'R'}${temps}\n`;
								}
							}, this);
							this.heat.chambers.forEach(function(chamber, index) {
								if (chamber && chamber.heaters.length) {
									const temps = chamber.heaters.map(() => targetTemp).reduce((a, b) => a + ':' + b);
									code += `M141 P${index} ${this.active ? 'S' : 'R'}${temps}\n`;
								}
							}, this);
							await this.sendCode(code);
						} else {
							console.warn('[tool-input] Invalid target for tool-input');
						}
					}
				} catch (e) {
					// handled before we get here
				}
				this.applying = false;
			} else {
				this.$makeNotification('warning', this.$t('error.enterValidNumber'));
			}
		},
		change(value) {
			// Note that value is of type String when a user enters a value and then leaves it without confirming...
			if (value.constructor === Number) {
				this.apply();
			}
		},
		blur() {
			this.value = this.actualValue;
		}
	},
	mounted() {
		this.input = this.$el.querySelector('input');
	},
	watch: {
		'tool.active'(to) {
			const val = (to instanceof Array) ? to[this.heaterIndex] : to;
			if (this.active && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = val;
				}
			}
		},
		'tool.standby'(to) {
			const val = (to instanceof Array) ? to[this.heaterIndex] : to;
			if (this.standby && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = val;
				}
			}
		},
		'bed.active'(to) {
			const val = (to instanceof Array) ? to[this.heaterIndex] : to;
			if (this.active && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = val;
				}
			}
		},
		'bed.standby'(to) {
			const val = (to instanceof Array) ? to[this.heaterIndex] : to;
			if (this.standby && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = val;
				}
			}
		},
		'chamber.active'(to) {
			const val = (to instanceof Array) ? to[this.heaterIndex] : to;
			if (this.active && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = val;
				}
			}
		},
		'chamber.standby'(to) {
			const val = (to instanceof Array) ? to[this.heaterIndex] : to;
			if (this.active && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = val;
				}
			}
		},
		'spindle.active'(to) {
			if (this.active && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.input) {
					this.value = to;
				}
			}
		}
	}
}
</script>
