<style scoped>
.control-input {
	min-width: 4.1rem;
}
</style>

<template>
	<v-combobox v-model="inputValue" v-model:menu="menuOpen" class="control-input" type="number" min="-273" max="1999" step="any" :label="label"
				:items="items" :loading="applying"
				:disabled="disabled || uiStore.uiFrozen || !isValid" density="compact" variant="underlined"
				hide-details hide-selected single-line @update:model-value="onModelValueChange" @keydown.enter="onEnter" @blur="onBlur" />
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore, LogLevel } from "@/stores/ui";
import i18n from "@/i18n";

const props = defineProps<{
	disabled?: boolean;
	label?: string;
	type: "all" | "tool" | "spindle" | "bed" | "chamber";
	controlTools?: boolean;
	controlBeds?: boolean;
	controlChambers?: boolean;
	index?: number;
	toolHeaterIndex?: number;
	active?: boolean;
	standby?: boolean;
}>();

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const applying = ref(false);
const menuOpen = ref(false);
const inputValue = ref<string | number>("0");
const actualValue = ref(0);

const items = computed<Array<number>>(() => {
	if (settingsStore.disableAutoComplete) {
		return [];
	}

	if (props.type === "spindle") {
		return settingsStore.spindleRPM;
	}
	const key = props.active ? "active" : "standby";
	if (props.type === "all") {
		if (props.controlBeds) {
			return settingsStore.temperatures.bed[key];
		}
		if (props.controlChambers) {
			return settingsStore.temperatures.chamber;
		}
		return settingsStore.temperatures.tool[key];
	}
	if (props.type === "tool") {
		return settingsStore.temperatures.tool[key];
	}
	if (props.type === "bed") {
		return settingsStore.temperatures.bed[key];
	}
	if (props.type === "chamber") {
		return settingsStore.temperatures.chamber;
	}
	return [];
});

const isValid = computed<boolean>(() => {
	if (props.type === "all" || props.type === "spindle") {
		return true;
	}
	const heaters = machineStore.model.heat.heaters;
	if (props.type === "tool") {
		const idx = props.index ?? -1;
		if (idx >= 0 && idx < machineStore.model.tools.length && machineStore.model.tools[idx] !== null) {
			const heaterIdx = machineStore.model.tools[idx]!.heaters[props.toolHeaterIndex ?? -1];
			return (heaterIdx >= 0) && (heaterIdx < heaters.length) && (heaters[heaterIdx] !== null);
		}
		return false;
	}
	if (props.type === "bed") {
		const mapping = machineStore.bedHeaterMapping;
		const idx = props.index ?? -1;
		return (idx >= 0) && (idx < mapping.length) && (mapping[idx].length > 0);
	}
	if (props.type === "chamber") {
		const mapping = machineStore.chamberHeaterMapping;
		const idx = props.index ?? -1;
		return (idx >= 0) && (idx < mapping.length) && (mapping[idx].length > 0);
	}
	return false;
});

const currentValue = computed<number>(() => {
	const activeOrStandby = props.active ? "active" : "standby";
	const heaters = machineStore.model.heat.heaters;
	switch (props.type) {
		case "all":
			if (props.controlBeds) {
				for (const heaterIndices of machineStore.bedHeaterMapping) {
					for (const heaterIndex of heaterIndices) {
						if (heaterIndex >= 0 && heaterIndex < heaters.length) {
							const heater = heaters[heaterIndex];
							if (heater !== null) {
								return heater[activeOrStandby];
							}
						}
					}
				}
			} else if (props.controlChambers) {
				for (const heaterIndices of machineStore.chamberHeaterMapping) {
					for (const heaterIndex of heaterIndices) {
						if (heaterIndex >= 0 && heaterIndex < heaters.length) {
							const heater = heaters[heaterIndex];
							if (heater !== null) {
								return heater[activeOrStandby];
							}
						}
					}
				}
			}
			return 0;

		case "tool": {
			const idx = props.index ?? -1;
			if (idx >= 0 && idx < machineStore.model.tools.length && machineStore.model.tools[idx] !== null) {
				const values = machineStore.model.tools[idx]![activeOrStandby];
				const heaterIdx = props.toolHeaterIndex ?? -1;
				if (heaterIdx >= 0 && heaterIdx < values.length) {
					return values[heaterIdx];
				}
			}
			return 0;
		}

		case "spindle": {
			const idx = props.index ?? -1;
			if (idx >= 0 && idx < machineStore.model.tools.length && machineStore.model.tools[idx] !== null) {
				return machineStore.model.tools[idx]!.spindleRpm;
			}
			return 0;
		}

		case "bed": {
			const idx = props.index ?? -1;
			const mapping = machineStore.bedHeaterMapping;
			if (idx >= 0 && idx < mapping.length) {
				for (const heaterIndex of mapping[idx]) {
					if (heaterIndex >= 0 && heaterIndex < heaters.length && heaters[heaterIndex] !== null) {
						return heaters[heaterIndex]![activeOrStandby];
					}
				}
			}
			return 0;
		}

		case "chamber": {
			const idx = props.index ?? -1;
			const mapping = machineStore.chamberHeaterMapping;
			if (idx >= 0 && idx < mapping.length) {
				for (const heaterIndex of mapping[idx]) {
					if (heaterIndex >= 0 && heaterIndex < heaters.length && heaters[heaterIndex] !== null) {
						return heaters[heaterIndex]![activeOrStandby];
					}
				}
			}
			return 0;
		}
	}
	return 0;
});

const numericValue = computed(() => (typeof inputValue.value === "number") ? inputValue.value : parseFloat(inputValue.value));

async function commit() {
	const value = numericValue.value;
	if (!isFinite(value)) {
		uiStore.log(LogLevel.warning, i18n.global.t("error.enterValidNumber"));
		return;
	}

	if (applying.value || value === actualValue.value) {
		return;
	}

	applying.value = true;
	try {
		const heaters = machineStore.model.heat.heaters;
		switch (props.type) {
			case "all": {
				let code = "";
				if (props.controlTools) {
					for (const tool of machineStore.model.tools) {
						if (tool && tool.heaters.length > 0) {
							const temps = tool.heaters.map(() => inputValue.value).join(":");
							code += `M568 P${tool.number} ${props.active ? "S" : "R"}${temps}\n`;
						}
					}
				}
				if (props.controlBeds) {
					// Use the store getter - falls back to the legacy flat `bedHeaters` array on
					// firmware that doesn't emit the newer `bedHeaterMapping`. P-index is the bed
					// slot index either way (matches M140 P{bed_index} semantics)
					machineStore.bedHeaterMapping.forEach((heaterIndices, i) => {
						if (heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < heaters.length)) {
							code += `M140 P${i} ${props.active ? "S" : "R"}${inputValue.value}\n`;
						}
					});
				}
				if (props.controlChambers) {
					machineStore.chamberHeaterMapping.forEach((heaterIndices, i) => {
						if (heaterIndices.some(heaterIndex => heaterIndex >= 0 && heaterIndex < heaters.length)) {
							code += `M141 P${i} ${props.active ? "S" : "R"}${inputValue.value}\n`;
						}
					});
				}
				if (code !== "") {
					await machineStore.sendCode(code);
				}
				actualValue.value = value;
				break;
			}
			case "tool":
				if (value >= -273.15 && value <= 1999) {
					const idx = props.index ?? -1;
					const tool = machineStore.model.tools[idx];
					if (tool) {
						const currentTemps = tool[props.active ? "active" : "standby"];
						const newTemps = currentTemps.map((temp, i) => (i === props.toolHeaterIndex) ? inputValue.value : temp).join(":");
						await machineStore.sendCode(`M568 P${idx} ${props.active ? "S" : "R"}${newTemps}`);
					}
				}
				break;
			case "spindle":
				await machineStore.sendCode(`M568 P${props.index} F${inputValue.value}`);
				break;
			case "bed":
				if (value >= -273.15 && value <= 1999) {
					await machineStore.sendCode(`M140 P${props.index} ${props.active ? "S" : "R"}${inputValue.value}`);
				}
				break;
			case "chamber":
				if (value >= -273.15 && value <= 1999) {
					await machineStore.sendCode(`M141 P${props.index} ${props.active ? "S" : "R"}${inputValue.value}`);
				}
				break;
		}
	} catch (e) {
		console.warn(e);
	}
	applying.value = false;
}

// v-combobox emits @update:model-value on every keystroke as well as on dropdown-item selection.
// Because the presets are numbers, only a selected item comes back as a number - typed text stays
// a string and is committed via Enter or blur instead
function onModelValueChange(newValue: string | number | null) {
	if (typeof newValue === "number") {
		commit();
	}
}

// v-combobox swallows Enter to open its menu, so the typed value must be committed from here
function onEnter() {
	menuOpen.value = false;
	commit();
}

// Commit on blur if the user typed a new value and tabbed/clicked away; otherwise revert the
// display to whatever the machine is currently reporting so the field doesn't get stuck
// showing an uncommitted draft
function onBlur() {
	if (applying.value) {
		return;
	}
	if (Number.isFinite(numericValue.value) && numericValue.value !== actualValue.value) {
		commit();
		return;
	}
	inputValue.value = actualValue.value.toString();
}

watch(currentValue, (to) => {
	if (isFinite(to) && actualValue.value !== to) {
		actualValue.value = to;
		inputValue.value = to.toString();
	}
});

onMounted(() => {
	actualValue.value = currentValue.value;
	inputValue.value = currentValue.value.toString();
});
</script>
