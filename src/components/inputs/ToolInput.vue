<template>
	<v-combobox ref="input" type="number" min="-273" max="1999" step="any" class="tool-input" :label="label" :menu-props="{ maxHeight: '50%' }"
				:value="inputValue" :search-input="inputValue" @update:search-input="change" @keyup.enter="apply" @blur="blur"
				:loading="applying" :disabled="uiFrozen || !isValid" :items="items" hide-selected>
	</v-combobox>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', ['heat', 'state', 'tools']),
		...mapState('machine/settings', ['spindleRPM', 'temperatures']),
		...mapState('settings', ['disableAutoComplete']),
		items() {
			if (this.disableAutoComplete) {
				return [];
			}

			if (this.spindle) {
				return this.spindleRPM;
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

			console.warn('[tool-input] Failed to retrieve temperature presets');
			return [];
		},
		isValid() {
			if (this.all || this.spindle) {
				return true;
			}
			if (this.tool) {
				if (this.toolHeaterIndex >= 0 && this.toolHeaterIndex < this.tool.heaters.length) {
					const heater = this.tool.heaters[this.toolHeaterIndex];
					return (heater >= 0 && heater < this.heat.heaters.length && this.heat.heaters[heater] !== null);
				}
			} else if (this.bed) {
				return (this.bedIndex >= 0 && this.bedIndex < this.heat.bedHeaters.length);
			} else if (this.chamber) {
				return (this.chamberIndex >= 0 && this.chamberIndex < this.heat.chamberHeaters.length);
			}
			return false;
		}
	},
	data() {
		return {
			applying: false,
			blurTimer: null,
			inputElement: null,
			actualValue: 0,
			inputValue: '0'
		}
	},
	props: {
		label: String,

		all: Boolean,
		controlTools: Boolean,
		controlBeds: Boolean,
		controlChambers: Boolean,

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

			const value = parseFloat(this.inputValue);
			if (!this.isNumber(value)) {
				this.$makeNotification('warning', this.$t('error.enterValidNumber'));
				return;
			}

			if (!this.applying) {
				this.applying = true;
				try {
					if (this.spindle) {
						// Set Spindle RPM
						await this.sendCode(`M568 P${this.tool.number} F${this.inputValue}`);
					} else if (this.inputValue >= -273.15 && this.inputValue <= 1999) {
						if (this.tool) {
							// Set tool temps
							const currentTemps = this.tool[this.active ? 'active' : 'standby'];
							const newTemps = currentTemps.map((temp, i) => (i === this.toolHeaterIndex) ? this.inputValue : temp, this).join(':');
							await this.sendCode(`M568 P${this.tool.number} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.bed) {
							// Set bed temp
							await this.sendCode(`M140 P${this.bedIndex} ${this.active ? 'S' : 'R'}${this.inputValue}`);
						} else if (this.chamber) {
							// Set chamber temp
							await this.sendCode(`M141 P${this.chamberIndex} ${this.active ? 'S' : 'R'}${this.inputValue}`);
						} else if (this.all) {
							// Set all temps
							let code = '';
							if (this.controlTools) {
								this.tools.forEach(function(tool) {
									if (tool && tool.heaters.length) {
										const temps = tool.heaters.map(() => this.inputValue, this).join(':');
										code += `M568 P${tool.number} ${this.active ? 'S' : 'R'}${temps}\n`;
									}
								}, this);
							}
							if (this.controlBeds) {
								this.heat.bedHeaters.forEach(function(bedHeater, bedIndex) {
									if (bedHeater >= 0 && bedHeater <= this.heat.heaters.length) {
										code += `M140 P${bedIndex} ${this.active ? 'S' : 'R'}${this.inputValue}\n`;
									}
								}, this);
							}
							if (this.controlChambers) {
								this.heat.chamberHeaters.forEach(function(chamberHeater, chamberIndex) {
									if (chamberHeater >= 0 && chamberHeater <= this.heat.heaters.length) {
										code += `M141 P${chamberIndex} ${this.active ? 'S' : 'R'}${this.inputValue}\n`;
									}
								}, this);
							}
							if (code !== '') {
								await this.sendCode(code);
							}
							this.actualValue = parseFloat(this.inputValue);
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
		blur() {
			if (window.oskOpen) {
				if (!this.blurTimer) {
					// Do not update the input value before a potentially installed on-screen keyboard is hidden.
					// This work-around is necessary because the input field loses focus every time a button is pressed
					this.blurTimer = setTimeout(this.checkAfterBlur.bind(this), 500);
				}
			} else {
				this.inputValue = this.actualValue.toString();
			}
		},
		checkAfterBlur() {
			this.blurTimer = null;
			this.blur();
		},
		async change(value) {
			// Note that value is of type String when a user enters a value and then leaves it without confirming...
			if (typeof value === 'number') {
				this.inputValue = value.toString();
				await this.apply();
			} else {
				this.inputValue = value;
			}
		}
	},
	mounted() {
		this.inputElement = this.$el.querySelector('input');
		if (this.spindle) {
			this.actualValue = this.tool.spindleRpm;
			this.inputValue = this.tool.spindleRpm.toString();
		} else if (this.tool) {
			if (this.tool[this.active ? 'active' : 'standby'].length > 0) {
				this.actualValue = this.tool[this.active ? 'active' : 'standby'][this.toolHeaterIndex];
				this.inputValue = this.tool[this.active ? 'active' : 'standby'][this.toolHeaterIndex].toString();
			}
		} else if (this.bed) {
			this.actualValue = this.bed[this.active ? 'active' : 'standby'];
			this.inputValue = this.bed[this.active ? 'active' : 'standby'].toString();
		} else if (this.chamber) {
			this.actualValue = this.chamber[this.active ? 'active' : 'standby'];
			this.inputValue = this.chamber[this.active ? 'active' : 'standby'].toString();
		}
	},
	watch: {
		'tool.active'(to) {
			const val = (to instanceof Array && this.toolHeaterIndex >= 0 && this.toolHeaterIndex < to.length) ? to[this.toolHeaterIndex] : to;
			if (this.active && this.isNumber(val) && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = val.toString();
				}
			}
		},
		'tool.standby'(to) {
			const val = (to instanceof Array && this.toolHeaterIndex >= 0 && this.toolHeaterIndex < to.length) ? to[this.toolHeaterIndex] : to;
			if (this.standby && this.isNumber(val) && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = val.toString();
				}
			}
		},
		'bed.active'(to) {
			if (this.active && this.isNumber(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		},
		'bed.standby'(to) {
			if (this.standby && this.isNumber(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		},
		'chamber.active'(to) {
			if (this.active && this.isNumber(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		},
		'chamber.standby'(to) {
			if (this.standby && this.isNumber(to) && this.actualValue != to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		},
		'tool.spindleRpm'(to) {
			if (this.active && this.isNumber(to) && this.actualValue != to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		}
	}
}
</script>
