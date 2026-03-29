<!-- Numeric input for tool / bed / chamber / spindle active+standby values.
	 Backed by a v-combobox so preset values can be picked from a dropdown; both typed values (Enter) and
	 dropdown picks fire @update:model-value, which commits the value via the appropriate M-code -->
<template>
	<v-form @submit.prevent="commit">
		<v-combobox v-model="inputValue" type="number" min="-273" max="1999" step="any" :label="label"
					:items="itemStrings" :menu-props="{ maxHeight: '50%' }" :loading="applying"
					:disabled="disabled || uiStore.uiFrozen || !isValid" density="compact" variant="outlined"
					hide-details hide-selected @update:model-value="commit" @blur="onBlur" />
	</v-form>
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
const inputValue = ref<string>("0");
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

const itemStrings = computed(() => items.value.map(value => value.toString()));

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
		const mapping = machineStore.model.heat.bedHeaterMapping;
		const idx = props.index ?? -1;
		return (idx >= 0) && (idx < mapping.length) && (mapping[idx].length > 0);
	}
	if (props.type === "chamber") {
		const mapping = machineStore.model.heat.chamberHeaterMapping;
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
				for (const heaterIndices of machineStore.model.heat.bedHeaterMapping) {
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
				for (const heaterIndices of machineStore.model.heat.chamberHeaterMapping) {
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
			const mapping = machineStore.model.heat.bedHeaterMapping;
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
			const mapping = machineStore.model.heat.chamberHeaterMapping;
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

async function commit() {
	const value = parseFloat(inputValue.value);
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
					for (let i = 0; i < machineStore.model.heat.bedHeaterMapping.length; i++) {
						if (machineStore.model.heat.bedHeaterMapping[i].some(heaterIndex => heaterIndex >= 0 && heaterIndex < heaters.length)) {
							code += `M140 P${i} ${props.active ? "S" : "R"}${inputValue.value}\n`;
						}
					}
				}
				if (props.controlChambers) {
					for (let i = 0; i < machineStore.model.heat.chamberHeaterMapping.length; i++) {
						if (machineStore.model.heat.chamberHeaterMapping[i].some(heaterIndex => heaterIndex >= 0 && heaterIndex < heaters.length)) {
							code += `M141 P${i} ${props.active ? "S" : "R"}${inputValue.value}\n`;
						}
					}
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

function onBlur() {
	if (!applying.value) {
		inputValue.value = actualValue.value.toString();
	}
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
