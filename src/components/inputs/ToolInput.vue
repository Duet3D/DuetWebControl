<style scoped>
.tool-input {
	min-width: 5rem;
}
</style>

<template>
	<v-combobox ref="input" type="number" min="-273" max="1999" step="any" class="tool-input" :value="inputValue" :search-input.sync="inputValue" :items="items" :label="label" :loading="applying" :disabled="uiFrozen" @keyup.enter="apply" @blur="value = actualValue">
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
		inputValue: {
			get() { return this.value.toString(); },
			set(value) { this.value = parseFloat(value); }
		},
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
							const newTemps = currentTemps.map((temp, i) => (i === heaterIndex) ? value : temp).join(':');
							await this.sendCode(`G10 P${this.tool.number} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.bed) {
							// Set bed temp
							const currentTemps = this.bed[this.active ? 'active' : 'standby'];
							const value = this.value, heaterIndex = this.heaterIndex;
							const newTemps = currentTemps.map((temp, i) => (i === heaterIndex) ? value : temp).join(':');
							await this.sendCode(`M140 P${this.bedIndex} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.chamber) {
							// Set chamber tem
							const currentTemps = this.chamber[this.active ? 'active' : 'standby'];
							const value = this.value, heaterIndex = this.heaterIndex;
							const newTemps = currentTemps.map((temp, i) => (i === heaterIndex) ? value : temp).join(':');
							await this.sendCode(`M141 P${this.chamberIndex} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.all) {
							// Set all temps
							let code = '';
							const targetTemp = this.value;
							this.tools.forEach(function(tool) {
								if (tool.heaters.length) {
									const temps = tool.heaters.map(() => targetTemp).join(':');
									code += `G10 P${tool.number} ${this.active ? 'S' : 'R'}${temps}\n`;
								}
							}, this);
							this.heat.beds.forEach(function(bed, index) {
								if (bed && bed.heaters.length) {
									const temps = bed.heaters.map(() => targetTemp).join(':');
									code += `M140 P${index} ${this.active ? 'S' : 'R'}${temps}\n`;
								}
							}, this);
							this.heat.chambers.forEach(function(chamber, index) {
								if (chamber && chamber.heaters.length) {
									const temps = chamber.heaters.map(() => targetTemp).join(':');
									code += `M141 P${index} ${this.active ? 'S' : 'R'}${temps}\n`;
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
			} else {
				this.$makeNotification('warning', this.$t('error.enterValidNumber'));
			}
		}
	},
	mounted() {
		this.input = this.$el.querySelector('input');
		if (this.tool) {
			this.value = this.tool[this.active ? 'active' : 'standby'][this.heaterIndex];
		} else if (this.bed) {
			this.value = this.bed[this.active ? 'active' : 'standby'][this.heaterIndex];
		} else if (this.chamber) {
			this.value = this.chamber[this.active ? 'active' : 'standby'][this.heaterIndex];
		} else if (this.spindle) {
			this.value = this.spindle.active;
		}
		this.actualValue = this.value;
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
