<template>
	<v-form submit.prevent="apply">
		<v-combobox ref="input" type="number" min="-273" max="1999" step="any" class="tool-input" :label="label"
					:menu-props="{ maxHeight: '50%' }" :value="inputValue" :search-input="inputValue"
					@update:search-input="change" @blur="blur" @keydown.enter.prevent="apply" :loading="applying"
					:disabled="uiFrozen || !isValid" :items="items" hide-selected>
		</v-combobox>
	</v-form>
</template>

<script lang="ts">
import { Heater, Spindle, Tool } from "@duet3d/objectmodel";
import Vue, { PropType } from "vue";

import store from "@/store";
import { isNumber } from "@/utils/numbers";
import { LogType } from "@/utils/logging";

export default Vue.extend({
	props: {
		label: String,

		all: Boolean,
		controlTools: Boolean,
		controlBeds: Boolean,
		controlChambers: Boolean,

		active: Boolean,
		standby: Boolean,

		tool: Object as PropType<Tool | undefined>,
		toolHeaterIndex: Number,

		spindle: Object as PropType<Spindle | undefined>,
		spindleIndex: Number,

		bed: Object as PropType<Heater | undefined>,
		bedIndex: Number,

		chamber: Object as PropType<Heater | undefined>,
		chamberIndex: Number
	},
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		items(): Array<number> {
			if (store.state.settings.disableAutoComplete) {
				return [];
			}

			if (this.spindle) {
				return store.state.machine.settings.spindleRPM;
			}
			const key = this.active ? "active" : "standby";
			if (this.tool || this.all) {
				return store.state.machine.settings.temperatures.tool[key];
			}
			if (this.bed) {
				return store.state.machine.settings.temperatures.bed[key];
			}
			if (this.chamber) {
				return store.state.machine.settings.temperatures.chamber;
			}

			console.warn("[tool-input] Failed to retrieve temperature presets");
			return [];
		},
		isValid(): boolean {
			if (this.all || this.spindle) {
				return true;
			}
			if (this.tool) {
				if (this.toolHeaterIndex >= 0 && this.toolHeaterIndex < this.tool.heaters.length) {
					const heater = this.tool.heaters[this.toolHeaterIndex];
					return (heater >= 0 && heater < store.state.machine.model.heat.heaters.length && store.state.machine.model.heat.heaters[heater] !== null);
				}
			} else if (this.bed) {
				return (this.bedIndex >= 0 && this.bedIndex < store.state.machine.model.heat.bedHeaters.length);
			} else if (this.chamber) {
				return (this.chamberIndex >= 0 && this.chamberIndex < store.state.machine.model.heat.chamberHeaters.length);
			}
			return false;
		}
	},
	data() {
		return {
			applying: false,
			blurTimer: null as NodeJS.Timeout | null,
			inputElement: null as HTMLInputElement | null,
			actualValue: 0,
			inputValue: "0"
		}
	},
	methods: {
		async apply() {
			this.$nextTick(() => (this.$refs.input as any).isMenuActive = false);			// FIXME There must be a better solution than this

			const value = parseFloat(this.inputValue);
			if (!isNumber(value)) {
				this.$makeNotification(LogType.warning, this.$t("error.enterValidNumber"));
				return;
			}

			if (!this.applying) {
				this.applying = true;
				try {
					const inputValue = parseFloat(this.inputValue);
					if (this.spindle) {
						if (this.tool) {
							// Set Spindle RPM
							await store.dispatch("machine/sendCode", `M568 P${this.tool.number} F${this.inputValue}`);
						} else {
							console.warn("[tool-input] Spindle specified but missing the tool, cannot apply changed values");
						}
					} else if (inputValue >= -273.15 && inputValue <= 1999) {
						if (this.tool) {
							// Set tool temps
							const currentTemps = this.tool[this.active ? "active" : "standby"];
							const newTemps = currentTemps.map((temp, i) => (i === this.toolHeaterIndex) ? this.inputValue : temp, this).join(':');
							await store.dispatch("machine/sendCode", `M568 P${this.tool.number} ${this.active ? 'S' : 'R'}${newTemps}`);
						} else if (this.bed) {
							// Set bed temp
							await store.dispatch("machine/sendCode", `M140 P${this.bedIndex} ${this.active ? 'S' : 'R'}${this.inputValue}`);
						} else if (this.chamber) {
							// Set chamber temp
							await store.dispatch("machine/sendCode", `M141 P${this.chamberIndex} ${this.active ? 'S' : 'R'}${this.inputValue}`);
						} else if (this.all) {
							// Set all temps
							let code = "";
							if (this.controlTools) {
								for (const tool of store.state.machine.model.tools) {
									if (tool && tool.heaters.length) {
										const temps = tool.heaters.map(() => this.inputValue, this).join(':');
										code += `M568 P${tool.number} ${this.active ? 'S' : 'R'}${temps}\n`;
									}
								}
							}
							if (this.controlBeds) {
								for (let i = 0; i < store.state.machine.model.heat.bedHeaters.length; i++) {
									const bedHeater = store.state.machine.model.heat.bedHeaters[i];
									if (bedHeater >= 0 && bedHeater <= store.state.machine.model.heat.heaters.length) {
										code += `M140 P${i} ${this.active ? 'S' : 'R'}${this.inputValue}\n`;
									}
								}
							}
							if (this.controlChambers) {
								for (let i = 0; i < store.state.machine.model.heat.chamberHeaters.length; i++) {
									const chamberHeater = store.state.machine.model.heat.chamberHeaters[i];
									if (chamberHeater >= 0 && chamberHeater <= store.state.machine.model.heat.heaters.length) {
										code += `M141 P${i} ${this.active ? 'S' : 'R'}${this.inputValue}\n`;
									}
								}
							}
							if (code !== "") {
								await store.dispatch("machine/sendCode", code);
							}
							this.actualValue = inputValue;
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
		async change(value: string | number) {
			// Note that value is of type String when a user enters a value and then leaves it without confirming...
			if (typeof value === "number") {
				this.inputValue = value.toString();
				await this.apply();
			} else {
				this.inputValue = value;
			}
		}
	},
	mounted() {
		this.inputElement = this.$el.querySelector("input");
		if (this.spindle) {
			if (this.tool) {
				this.actualValue = this.tool.spindleRpm;
				this.inputValue = this.tool.spindleRpm.toString();
			} else {
				console.warn("[tool-input] Spindle specified but missing the tool, cannot apply changed values");
			}
		} else {
			const activeOrStandby = this.active ? "active" : "standby";
			if (this.tool) {
				if (this.tool[activeOrStandby].length > 0) {
					this.actualValue = this.tool[activeOrStandby][this.toolHeaterIndex];
					this.inputValue = this.tool[activeOrStandby][this.toolHeaterIndex].toString();
				}
			} else if (this.bed) {
				this.actualValue = this.bed[activeOrStandby];
				this.inputValue = this.bed[activeOrStandby].toString();
			} else if (this.chamber) {
				this.actualValue = this.chamber[activeOrStandby];
				this.inputValue = this.chamber[activeOrStandby].toString();
			}
		}
	},
	watch: {
		"tool.active"(to) {
			const val = (to instanceof Array && this.toolHeaterIndex >= 0 && this.toolHeaterIndex < to.length) ? to[this.toolHeaterIndex] : to;
			if (this.active && isNumber(val) && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = val.toString();
				}
			}
		},
		"tool.standby"(to) {
			const val = (to instanceof Array && this.toolHeaterIndex >= 0 && this.toolHeaterIndex < to.length) ? to[this.toolHeaterIndex] : to;
			if (this.standby && isNumber(val) && this.actualValue !== val) {
				this.actualValue = val;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = val.toString();
				}
			}
		},
		"bed.active"(to) {
			if (this.active && isNumber(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		},
		"bed.standby"(to) {
			if (this.standby && isNumber(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		},
		"chamber.active"(to) {
			if (this.active && isNumber(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		},
		"chamber.standby"(to) {
			if (this.standby && isNumber(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		},
		"tool.spindleRpm"(to) {
			if (this.active && isNumber(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		}
	}
});
</script>
