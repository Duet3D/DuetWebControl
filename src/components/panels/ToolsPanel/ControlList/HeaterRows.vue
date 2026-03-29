<!-- Renders bed or chamber heater rows for the ControlList. When the user has enabled the matching
	 "single control" setting (and all heaters share state/active/standby), a single combined row with one
	 active+standby ControlInput is rendered instead of one row per heater -->
<template>
	<tbody>
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
											v-text="props.type === 'bed' ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
									{{ props.type === "bed" ? $t("panel.tools.allBeds") : $t("panel.tools.allChambers") }}
								</v-list-item-title>
							</v-list-item>

							<template v-for="{ heater, heaterIndex, index } in heaterItems">
								<v-list-item v-if="heater !== null" :key="index"
											 @click="selectHeater(index, heater, heaterIndex)">
									<v-list-item-title>
										<v-icon size="small" class="mr-1"
												v-text="props.type === 'bed' ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
										{{ props.type === "bed" ? $t("panel.tools.bed", [index]) : $t("panel.tools.chamber", [index]) }}
									</v-list-item-title>
								</v-list-item>
							</template>
						</v-list>
					</v-menu>
				</th>

				<th v-if="selectedHeater !== null">
					<a href="javascript:void(0)" :class="getHeaterClasses(selectedHeaterIndex)"
					   @click="heaterClick(selectedIndex, selectedHeater)">
						{{ getHeaterName(selectedHeater, selectedHeaterIndex) }}
					</a>
					<br>
					<span class="font-weight-regular text-caption">
						{{ $t(`generic.heaterStates.${selectedHeater.state}`) }}
					</span>
				</th>
				<th v-else>
					<a href="javascript:void(0)" class="font-weight-regular" @click="allHeatersClick">
						{{ $t(`generic.heaterStates.${firstHeater.state}`) }}
					</a>
				</th>

				<td>
					{{ getHeaterValue(firstHeater) }}
				</td>

				<td class="pl-2 pr-1">
					<ControlInput type="all"
								  :control-beds="props.type === 'bed' && settingsStore.singleBedControl"
								  :control-chambers="props.type === 'chamber' && settingsStore.singleChamberControl"
								  active />
				</td>

				<td class="pl-1 pr-2">
					<ControlInput type="all"
								  :control-beds="props.type === 'bed' && settingsStore.singleBedControl"
								  :control-chambers="props.type === 'chamber' && settingsStore.singleChamberControl"
								  standby />
				</td>
			</tr>
		</template>
		<template v-else-if="heaterItems.some(item => item.heater !== null)">
			<template v-for="{ index, heater, heaterIndex } in heaterItems">
				<template v-if="heater !== null">
					<tr :key="index">
						<th class="pl-2">
							<a v-if="heaterIndex === 0" href="javascript:void(0)" :class="{ disabled }"
							   @click="heaterClick(index, heater)">
								<v-icon size="small"
										v-text="props.type === 'bed' ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
								{{ props.type === "bed" ? $t("panel.tools.bed", [heaterItems.length === 1 ? "" : index]) : $t("panel.tools.chamber", [heaterItems.length === 1 ? "" : index]) }}
							</a>
						</th>

						<th :class="{ 'pb-3': heaterIndex > 0 }">
							<a href="javascript:void(0)" :class="getHeaterClasses(heaterIndex)"
							   @click="heaterClick(index, heater)">
								{{ getHeaterName(heater, heaterIndex) }}
							</a>
							<br>
							<span class="font-weight-regular text-caption">
								{{ $t(`generic.heaterStates.${heater.state}`) }}
							</span>
						</th>

						<td>
							{{ getHeaterValue(heater) }}
						</td>

						<td class="pl-2 pr-1">
							<ControlInput v-if="heaterIndex === 0" :type="props.type" :index="index" active />
						</td>

						<td class="pl-1 pr-2">
							<ControlInput v-if="heaterIndex === 0" :type="props.type" :index="index" standby />
						</td>
					</tr>
				</template>
			</template>
		</template>
	</tbody>
</template>

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

<script setup lang="ts">
import { type Heater, HeaterState, MachineStatus } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
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
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const disabled = computed<boolean>(() =>
	uiStore.uiFrozen || [MachineStatus.pausing, MachineStatus.processing, MachineStatus.resuming].includes(machineStore.model.state.status));

// Single-control is only meaningful when the matching setting is on AND every heater in the mapping
// shares the same state, active and standby - otherwise the combined input would lie about the values
const singleControl = computed(() => {
	if (props.type === "bed" && !settingsStore.singleBedControl) {
		return false;
	}
	if (props.type === "chamber" && !settingsStore.singleChamberControl) {
		return false;
	}

	const mapping = (props.type === "bed") ? machineStore.model.heat.bedHeaterMapping : machineStore.model.heat.chamberHeaterMapping;
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
	const mapping = (props.type === "bed") ? machineStore.model.heat.bedHeaterMapping : machineStore.model.heat.chamberHeaterMapping;
	const heaterList: Array<{ index: number; heater: Heater; heaterIndex: number }> = [];
	for (let index = 0; index < mapping.length; index++) {
		for (const heaterIndex of mapping[index]) {
			if (heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length) {
				const heater = machineStore.model.heat.heaters[heaterIndex];
				if (heater !== null) {
					heaterList.push({ index, heater, heaterIndex });
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

	const mapping = (props.type === "bed") ? machineStore.model.heat.bedHeaterMapping : machineStore.model.heat.chamberHeaterMapping;
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
