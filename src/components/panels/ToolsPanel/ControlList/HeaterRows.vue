<style scoped>
.disabled {
	color: inherit;
	cursor: default;
}

.disabled-heater {
	cursor: default;
}

.disabled:hover,
.disabled-heater {
	text-decoration: none;
}
</style>

<template>
	<tbody class="heater-rows">
		<template v-if="singleControl && firstHeater !== null">
			<!-- Single Heater Control-->
			<tr>
				<th class="pl-2">
					<v-menu location="bottom" :disabled="disabled">
						<template #activator="{ props }">
							<a v-bind="props" href="javascript:void(0)" :class="{ disabled }">
								{{ singleHeaderCaption }}
								<v-icon density="compact" class="ms-n1">mdi-menu-down</v-icon>
							</a>
						</template>
						<v-list>
							<v-list-item @click="selectHeater(-1, null, -1)">
								<v-list-item-title>
									<v-icon size="small"
											:icon="props.type === 'bed' ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
									{{ props.type === "bed" ? $t("panel.tools.allBeds") : $t("panel.tools.allChambers") }}
								</v-list-item-title>
							</v-list-item>

							<template v-for="{ heater, heaterIndex, index } in heaterItems">
								<v-list-item v-if="heater !== null" :key="index"
											 @click="selectHeater(index, heater, heaterIndex)">
									<v-list-item-title>
										<v-icon size="small" class="mr-1"
												:icon="props.type === 'bed' ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
										{{ props.type === "bed" ? $t("panel.tools.bed", [index]) : $t("panel.tools.chamber", [index]) }}
									</v-list-item-title>
								</v-list-item>
							</template>
						</v-list>
					</v-menu>
				</th>

				<td v-if="selectedHeater !== null" class="font-weight-bold">
					<v-tooltip location="top" :text="getHeaterPower(selectedHeater)">
						<template #activator="{ props: tooltipProps }">
							<a v-bind="tooltipProps" href="javascript:void(0)" :class="getHeaterClasses(selectedHeaterIndex)"
							   @click="heaterClick(selectedIndex, selectedHeater)">
								{{ getHeaterName(selectedHeater, selectedHeaterIndex) }}
							</a>
						</template>
					</v-tooltip>
					<br>
					<span class="font-weight-regular text-body-small">
						{{ $t(`generic.heaterStates.${selectedHeater.state}`) }}
					</span>
				</td>
				<td v-else class="font-weight-bold">
					<a href="javascript:void(0)" class="font-weight-regular" @click="allHeatersClick">
						{{ $t(`generic.heaterStates.${firstHeater.state}`) }}
					</a>
				</td>

				<td>
					{{ getHeaterValue(firstHeater) }}
				</td>

				<td v-if="toolSettings.showActiveTemperatures" class="pl-2 pr-1">
					<ControlInput type="all"
								  :control-beds="props.type === 'bed' && toolSettings.singleBedControl"
								  :control-chambers="props.type === 'chamber' && toolSettings.singleChamberControl"
								  active />
				</td>

				<td v-if="toolSettings.showStandbyTemperatures" class="pl-1 pr-2">
					<ControlInput type="all"
								  :control-beds="props.type === 'bed' && toolSettings.singleBedControl"
								  :control-chambers="props.type === 'chamber' && toolSettings.singleChamberControl"
								  standby />
				</td>
			</tr>
		</template>
		<template v-else-if="heaterItems.some(item => item.heater !== null)">
			<template v-for="{ index, heater, heaterIndex, first } in heaterItems">
				<template v-if="heater !== null">
					<tr :key="index">
						<th class="pl-2">
							<a v-if="first" href="javascript:void(0)" :class="{ disabled }"
							   @click="heaterClick(index, heater)">
								<v-icon size="small"
										:icon="props.type === 'bed' ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
								{{ props.type === "bed" ? $t("panel.tools.bed", [heaterItems.length === 1 ? "" : index]) : $t("panel.tools.chamber", [heaterItems.length === 1 ? "" : index]) }}
							</a>
						</th>

						<td :class="{ 'pb-3': !first }" class="font-weight-bold">
							<v-tooltip location="top" :text="getHeaterPower(heater)">
								<template #activator="{ props: tooltipProps }">
									<a v-bind="tooltipProps" href="javascript:void(0)" :class="getHeaterClasses(heaterIndex)"
									   @click="heaterClick(index, heater)">
										{{ getHeaterName(heater, heaterIndex) }}
									</a>
								</template>
							</v-tooltip>
							<br>
							<span class="font-weight-regular text-body-small">
								{{ $t(`generic.heaterStates.${heater.state}`) }}
							</span>
						</td>

						<td>
							{{ getHeaterValue(heater) }}
						</td>

						<td v-if="toolSettings.showActiveTemperatures" class="pl-2 pr-1">
							<ControlInput v-if="first" :type="props.type" :index="index" active />
						</td>

						<td v-if="toolSettings.showStandbyTemperatures" class="pl-1 pr-2">
							<ControlInput v-if="first" :type="props.type" :index="index" standby />
						</td>
					</tr>
				</template>
			</template>
		</template>
	</tbody>
</template>

<script setup lang="ts">
import { type Heater, HeaterState, MachineStatus } from "@duet3d/objectmodel";

import { TOOL_DISPLAY_SETTINGS_KEY } from "../toolSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { getHeaterColor } from "@/utils/colors";
import { displaySensorValue } from "@/utils/display";

const props = defineProps<{
	type: "bed" | "chamber";
}>();

const emit = defineEmits<{
	(e: "resetHeaterFault", heater: number): void;
}>();

const machineStore = useMachineStore();
const uiStore = useUiStore();

const toolSettings = inject(TOOL_DISPLAY_SETTINGS_KEY)!;

const disabled = computed<boolean>(() =>
	uiStore.uiFrozen || [MachineStatus.pausing, MachineStatus.processing, MachineStatus.resuming].includes(machineStore.model.state.status));

// Single-control is only meaningful when the matching setting is on AND every heater in the mapping
// shares the same state, active and standby - otherwise the combined input would lie about the values
const singleControl = computed(() => {
	if (props.type === "bed" && !toolSettings.value.singleBedControl) {
		return false;
	}
	if (props.type === "chamber" && !toolSettings.value.singleChamberControl) {
		return false;
	}

	const mapping = (props.type === "bed") ? machineStore.bedHeaterMapping : machineStore.chamberHeaterMapping;
	let state: HeaterState | null = null, active: number | null = null, standby: number | null = null;
	for (const heaterIndices of mapping) {
		for (const heaterIndex of heaterIndices) {
			if (heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length) {
				const heater = machineStore.model.heat.heaters[heaterIndex];
				if (heater !== null) {
					if (state === null) {
						state = heater.state;
						active = heater.active;
						standby = heater.standby;
					} else if (heater.state !== state || heater.active !== active || heater.standby !== standby) {
						return false;
					}
				}
			}
		}
	}
	return state !== null;
});

const heaterItems = computed(() => {
	const mapping = (props.type === "bed") ? machineStore.bedHeaterMapping : machineStore.chamberHeaterMapping;
	const displayed = (props.type === "bed") ? toolSettings.value.displayedBeds : toolSettings.value.displayedChambers;
	const heaterList: Array<{ index: number; heater: Heater; heaterIndex: number; first: boolean }> = [];
	for (let index = 0; index < mapping.length; index++) {
		if (displayed !== null && !displayed.includes(index)) {
			continue;
		}
		// `first` marks the leading heater of each slot - it carries the slot label and the
		// active/standby inputs, while any further heaters of the same slot list only their value.
		// This is positional, not the heater number: a chamber on heater 2 is still its slot's first
		let first = true;
		for (const heaterIndex of mapping[index]) {
			if (heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length) {
				const heater = machineStore.model.heat.heaters[heaterIndex];
				if (heater !== null) {
					heaterList.push({ index, heater, heaterIndex, first });
					first = false;
				}
			}
		}
	}
	return heaterList;
});
const firstHeater = computed(() => (heaterItems.value.length > 0) ? heaterItems.value[0].heater : null);

const selectedIndex = ref(-1), selectedHeater = ref<Heater | null>(null), selectedHeaterIndex = ref(-1);

function selectHeater(index: number, heater: Heater | null, heaterIndex: number) {
	selectedIndex.value = index;
	selectedHeater.value = heater;
	selectedHeaterIndex.value = heaterIndex;
}

const singleHeaderCaption = computed(() => {
	if (selectedHeater.value === null) {
		return (props.type === "bed") ? i18n.global.t("panel.tools.beds") : i18n.global.t("panel.tools.chambers");
	}
	return (props.type === "bed") ? i18n.global.t("panel.tools.bed", [""]) : i18n.global.t("panel.tools.chamber", [""]);
});

async function allHeatersClick() {
	if (disabled.value) {
		return;
	}

	const mapping = (props.type === "bed") ? machineStore.bedHeaterMapping : machineStore.chamberHeaterMapping;
	const indices: Array<number> = [];
	for (let index = 0; index < mapping.length; index++) {
		for (const heaterIndex of mapping[index]) {
			if (heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length) {
				const heater = machineStore.model.heat.heaters[heaterIndex];
				if (heater !== null) {
					if (!indices.includes(index)) {
						indices.push(index);
					}

					// Treat any fault encountered while scanning as a fault on the first heater - the reset
					// dialog only handles one heater at a time
					if (heater.state === HeaterState.fault) {
						emit("resetHeaterFault", heaterIndex);
						return;
					}
				}
			}
		}
	}

	const first = firstHeater.value;
	if (first !== null) {
		if (props.type === "bed") {
			switch (first.state) {
				case HeaterState.off:
					await machineStore.sendCode(indices.map(index => `M140 P${index} S${first.active}`).join("\n"));
					break;
				case HeaterState.standby:
					await machineStore.sendCode(indices.map(index => `M140 P${index} S-273.15`).join("\n"));
					break;
				case HeaterState.active:
					await machineStore.sendCode(indices.map(index => `M144 P${index}`).join("\n"));
					break;
			}
		} else {
			switch (first.state) {
				case HeaterState.off:
					await machineStore.sendCode(indices.map(index => `M141 P${index} S${first.active}`).join("\n"));
					break;
				default:
					await machineStore.sendCode(indices.map(index => `M141 P${index} S-273.15`).join("\n"));
					break;
			}
		}
	}
}

function getHeaterClasses(heaterIndex: number) {
	const classes = [getHeaterColor(heaterIndex)];
	if (disabled.value) {
		classes.push("disabled-heater");
	}
	return classes;
}

function getHeaterName(heater: Heater | null, heaterIndex: number) {
	if (heater !== null && heater.sensor >= 0 && heater.sensor < machineStore.model.sensors.analog.length) {
		const sensor = machineStore.model.sensors.analog[heater.sensor];
		if (sensor !== null && sensor.name) {
			const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
			if (matches) {
				return matches[1];
			}
			return sensor.name;
		}
	}
	return i18n.global.t("panel.tools.heater", [heaterIndex]);
}

function getHeaterValue(heater: Heater | null) {
	if (heater !== null && heater.sensor >= 0 && heater.sensor < machineStore.model.sensors.analog.length) {
		const sensor = machineStore.model.sensors.analog[heater.sensor];
		if (sensor !== null) {
			return displaySensorValue(sensor);
		}
	}
	return i18n.global.t("generic.noValue");
}

// avgPwm is a 0..1 duty cycle; surface it as the current heater output power on hover
function getHeaterPower(heater: Heater | null) {
	if (heater === null) {
		return undefined;
	}
	return i18n.global.t("panel.tools.heaterPower", [`${Math.round(heater.avgPwm * 100)}%`]);
}

async function heaterClick(index: number, heater: Heater | null) {
	if (disabled.value || !heater) {
		return;
	}

	if (props.type === "bed") {
		switch (heater.state) {
			case HeaterState.off:
				await machineStore.sendCode(`M140 P${index} S${heater.active}`);
				break;
			case HeaterState.standby:
				await machineStore.sendCode(`M140 P${index} S-273.15`);
				break;
			case HeaterState.active:
				await machineStore.sendCode(`M144 P${index}`);
				break;
			case HeaterState.fault:
				emit("resetHeaterFault", machineStore.model.heat.heaters.indexOf(heater));
				break;
		}
	} else {
		switch (heater.state) {
			case HeaterState.off:
				await machineStore.sendCode(`M141 P${index} S${heater.active}`);
				break;
			case HeaterState.fault:
				emit("resetHeaterFault", machineStore.model.heat.heaters.indexOf(heater));
				break;
			default:
				await machineStore.sendCode(`M141 P${index} S-273.15`);
				break;
		}
	}
}
</script>
