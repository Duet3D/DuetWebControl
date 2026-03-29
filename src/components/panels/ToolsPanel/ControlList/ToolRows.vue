<!-- Renders one row per heater/spindle for each tool in the ControlList table.
	 With groupTools, identical tools collapse into a single row with a dropdown to pick which to select;
	 filament-bearing tools get a load/change/reassign menu; spindle-bearing tools get rotation buttons -->
<template>
	<tbody>
		<template v-if="toolsToDisplay.length > 0">
			<template v-for="(tool, toolIndex) in toolsToDisplay" :key="`tool-${tool.number}`">
				<tr v-for="(toolHeater, toolHeaterIndex) in getToolHeaters(tool)"
					:key="`tool-${tool.number}-${toolHeaterIndex}`"
					:class="(tool.number === currentToolNumber) ? selectedToolClass : ''">
					<th v-if="toolHeaterIndex === 0" :rowspan="Math.max(1, tool.heaters.length)" class="pl-2"
						:class="{ 'pt-2 pb-2': !tool.heaters.length && !toolHeater }">
						<a v-if="!isToolCollapsed(tool)" href="javascript:void(0)" :class="{ disabled }"
						   @click="toolClick(tool)">
							<v-progress-circular v-if="tool === busyTool" indeterminate color="primary" :size="14" />
							<v-icon v-if="getToolIcon(tool)" size="small" :icon="getToolIcon(tool)!" />
							{{ tool.name || $t("panel.tools.tool", [tool.number]) }}
						</a>
						<v-menu v-else location="bottom">
							<template #activator="{ props: activatorProps }">
								<a v-bind="activatorProps" href="javascript:void(0)">
									<v-progress-circular v-if="isCollapsedToolBusy(tool)" indeterminate color="primary"
														 :size="14" />
									<v-icon v-if="getToolIcon(tool)" size="small" :icon="getToolIcon(tool)!" />
									{{ tool.name || $t("panel.tools.tool", [tool.number]) }}
									<v-icon size="small">mdi-menu-down</v-icon>
								</a>
							</template>

							<v-list>
								<v-list-item v-for="otherTool in getCollapsedTools(tool)" :key="otherTool.number"
											 @click="toolClick(otherTool)">
									<v-icon v-if="getToolIcon(tool)" class="mr-1" :icon="getToolIcon(tool)!" />
									{{ otherTool.name ? `${otherTool.name} (T${otherTool.number})` : $t("panel.tools.tool", [otherTool.number]) }}
								</v-list-item>
							</v-list>
						</v-menu>

						<br>
						<span class="font-weight-regular text-caption">
							T{{ tool.number }}

							<template v-if="canLoadFilament(tool)">
								-
								<v-menu v-if="getFilament(tool)" location="bottom" :disabled="disabled">
									<template #activator="{ props: activatorProps }">
										<a v-bind="activatorProps" href="javascript:void(0)" class="font-weight-regular"
										   :class="{ disabled }">
											{{ getFilament(tool) }}
										</a>
									</template>

									<v-list>
										<v-list-item @click="showFilamentDialog(tool, true)">
											<v-icon class="mr-1">mdi-swap-vertical</v-icon>
											{{ $t("panel.tools.changeFilament") }}
										</v-list-item>
										<v-list-item @click="showFilamentDialog(tool, false)">
											<v-icon class="mr-1">mdi-pencil</v-icon>
											{{ $t("panel.tools.reassignFilament") }}
										</v-list-item>
										<v-list-item @click="unloadFilament(tool)">
											<v-icon class="mr-1">mdi-arrow-up</v-icon>
											{{ $t("panel.tools.unloadFilament") }}
										</v-list-item>
									</v-list>
								</v-menu>
								<a v-else href="javascript:void(0)" :class="{ disabled }"
								   @click="showFilamentDialog(tool, true)">
									{{ $t("panel.tools.loadFilament") }}
								</a>
							</template>
						</span>
					</th>

					<template v-if="!toolHeater && getSpindle(tool)">
						<td>
							<template v-if="tool.number === currentToolNumber">
								<v-row dense>
									<v-col>
										<CodeButton code="M4" no-wait size="small">
											<v-icon>mdi-rotate-left</v-icon>
										</CodeButton>
										<CodeButton code="M3" no-wait size="small">
											<v-icon>mdi-rotate-right</v-icon>
										</CodeButton>
									</v-col>
								</v-row>
								<v-row dense>
									<v-col>
										<CodeButton code="M5" no-wait size="small">
											<v-icon>mdi-stop</v-icon>
										</CodeButton>
									</v-col>
								</v-row>
							</template>
						</td>

						<td class="text-center">
							{{ display(getSpindleSpeed(tool), 0, $t("generic.rpm")) }}
						</td>

						<td>
							<ControlInput type="spindle" :index="tool.number" active />
						</td>

						<td>
							<!-- Spindles do not have a standby value -->
						</td>
					</template>
					<template v-else>
						<th>
							<template v-if="toolHeater">
								<a href="javascript:void(0)" @click="toolHeaterClick(tool, toolHeater)"
								   :class="getHeaterClasses(tool.heaters[toolHeaterIndex])">
									{{ getHeaterName(toolHeater, tool.heaters[toolHeaterIndex]) }}
								</a>
								<template v-if="toolHeater.state !== null">
									<br>
									<span class="font-weight-regular text-caption">
										{{ $t(`generic.heaterStates.${toolHeater.state}`) }}
									</span>
								</template>
							</template>
							<span v-else>
								{{ $t("generic.noValue") }}
							</span>
						</th>

						<td>
							{{ getHeaterValue(toolHeater) }}
						</td>

						<td class="pl-2 pr-1">
							<ControlInput :disabled="isToolBusy(tool)" type="tool" :index="tool.number"
										  :tool-heater-index="toolHeaterIndex" active />
						</td>

						<td class="pl-1 pr-2">
							<ControlInput :disabled="isToolBusy(tool)" type="tool" :index="tool.number"
										  :tool-heater-index="toolHeaterIndex" standby />
						</td>
					</template>
				</tr>

				<tr v-if="toolIndex < toolsToDisplay.length - 1" :key="`div-tool-${toolIndex}`">
					<td colspan="5">
						<v-divider />
					</td>
				</tr>
			</template>
		</template>

		<!-- Shared dialog instance (one for the whole list, not per row) -->
		<FilamentDialog v-model:shown="filamentDialogShown" :run-macros="filamentRunMacros"
						:tool="filamentDialogTool" />
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
import { type Heater, HeaterState, MachineStatus, type Spindle, SpindleState, type Tool } from "@duet3d/objectmodel";
import { DisconnectedError } from "@duet3d/connectors";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore, LogLevel } from "@/stores/ui";
import { getHeaterColor } from "@/utils/colors";
import { display, displaySensorValue } from "@/utils/display";
import { getErrorMessage } from "@/utils/errors";

const emit = defineEmits<{
	(e: "resetHeaterFault", heater: number): void;
}>();

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const disabled = computed<boolean>(() =>
	uiStore.uiFrozen || [MachineStatus.pausing, MachineStatus.processing, MachineStatus.resuming, MachineStatus.simulating].includes(machineStore.model.state.status));

const toolsToDisplay = computed<Array<Tool>>(() => {
	if (!settingsStore.groupTools) {
		return machineStore.model.tools.filter(tool => tool !== null) as Array<Tool>;
	}

	const tools: Array<Tool> = [];
	for (const item of machineStore.model.tools) {
		if (item !== null) {
			let equalToolFound = false;
			for (let i = 0; i < tools.length; i++) {
				const tool = tools[i];
				if ((!settingsStore.groupByExtruders || (item.extruders.length === tool.extruders.length && item.extruders.every((extruder, index) => extruder === tool.extruders[index]))) &&
					(!settingsStore.groupByHeaters || (item.heaters.length === tool.heaters.length && item.heaters.every((heater, index) => heater === tool.heaters[index]))) &&
					(!settingsStore.groupByOffsets || (item.offsets.length === tool.offsets.length && item.offsets.every((offset, index) => offset === tool.offsets[index]))) &&
					(!settingsStore.groupBySpindle || (item.spindle === tool.spindle))) {
					equalToolFound = true;
					if (item.number === machineStore.model.state.currentTool) {
						// Prefer the currently-selected tool when collapsing identical entries so the row
						// reflects the active tool's name/icon
						tools[i] = item;
					}
				}
			}
			if (!equalToolFound) {
				tools.push(item);
			}
		}
	}
	return tools;
});

const currentToolNumber = computed(() => machineStore.model.state.currentTool);
const busyTool = ref<Tool | null>(null);
const selectedToolClass = computed(() => settingsStore.darkTheme ? "bg-grey-darken-3" : "bg-blue-lighten-5");

function isToolCollapsed(tool: Tool) {
	if (toolsToDisplay.value.length < machineStore.model.tools.length) {
		for (const item of machineStore.model.tools) {
			if (item !== null && item !== tool) {
				if ((item.extruders.length === tool.extruders.length && item.extruders.every((extruder, index) => extruder === tool.extruders[index])) &&
					(item.heaters.length === tool.heaters.length && item.heaters.every((heater, index) => heater === tool.heaters[index])) &&
					(item.offsets.length === tool.offsets.length && item.offsets.every((offset, index) => offset === tool.offsets[index])) &&
					item.spindle === tool.spindle) {
					return true;
				}
			}
		}
	}
	return false;
}

function getCollapsedTools(tool: Tool) {
	const tools: Array<Tool> = [];
	for (const item of machineStore.model.tools) {
		if (item !== null &&
			(item.extruders.length === tool.extruders.length && item.extruders.every((extruder, index) => extruder === tool.extruders[index])) &&
			(item.heaters.length === tool.heaters.length && item.heaters.every((heater, index) => heater === tool.heaters[index])) &&
			(item.offsets.length === tool.offsets.length && item.offsets.every((offset, index) => offset === tool.offsets[index])) &&
			item.spindle === tool.spindle) {
			tools.push(item);
		}
	}
	return tools;
}

function isCollapsedToolBusy(tool: Tool) {
	return getCollapsedTools(tool).includes(busyTool.value as Tool);
}

function isToolBusy(tool: Tool) {
	return isToolCollapsed(tool) ? isCollapsedToolBusy(tool) : (busyTool.value === tool);
}

function getToolIcon(tool: Tool): string | null {
	if (tool.extruders.length > 0) {
		if (machineStore.model.heat.heaters.some((heater, heaterIndex) => heater !== null && heater.state === HeaterState.fault && tool.heaters.includes(heaterIndex))) {
			return "mdi-printer-3d-nozzle-alert";
		}
		return "mdi-printer-3d-nozzle";
	}
	if (tool.spindle >= 0) {
		return "mdi-saw-blade";
	}
	if (tool.name.toLowerCase().includes("laser")) {
		// The object model does not yet expose laser/tool binding, so fall back to a name heuristic
		return "mdi-star-four-points-circle-outline";
	}
	return null;
}

async function toolClick(tool: Tool) {
	if (disabled.value || busyTool.value !== null) {
		return;
	}

	busyTool.value = tool;
	try {
		const param = settingsStore.toolChangeParameter;
		if (machineStore.model.state.currentTool === tool.number) {
			await machineStore.sendCode("T-1" + param);
		} else {
			await machineStore.sendCode(`T${tool.number}${param}`);
		}
	} catch (e) {
		if (!(e instanceof DisconnectedError)) {
			uiStore.log(LogLevel.error, getErrorMessage(e));
		}
	}
	busyTool.value = null;
}

const filamentDialogShown = ref(false);
const filamentRunMacros = ref(true);
const filamentDialogTool = ref<Tool | null>(null);

function getFilament(tool: Tool) {
	if (tool.filamentExtruder >= 0 && tool.filamentExtruder < machineStore.model.move.extruders.length) {
		return machineStore.model.move.extruders[tool.filamentExtruder]?.filament ?? null;
	}
	return null;
}

function canLoadFilament(tool: Tool) {
	return tool.filamentExtruder >= 0 && tool.filamentExtruder < machineStore.model.move.extruders.length;
}

function showFilamentDialog(tool: Tool, runMacros: boolean) {
	if (busyTool.value !== null || disabled.value) {
		return;
	}

	filamentDialogTool.value = tool;
	filamentRunMacros.value = runMacros;
	filamentDialogShown.value = true;
}

async function unloadFilament(tool: Tool) {
	if (busyTool.value !== null || disabled.value) {
		return;
	}

	busyTool.value = tool;
	try {
		let code = "";
		if (currentToolNumber.value !== tool.number) {
			code = `T${tool.number}\n`;
		}
		code += "M702";
		await machineStore.sendCode(code);
	} finally {
		busyTool.value = null;
	}
}

function getToolHeaters(tool: Tool): Array<Heater | null> {
	const heaters = machineStore.model.heat.heaters;
	const toolHeaters = tool.heaters
		.filter(heaterIndex => heaterIndex >= 0 && heaterIndex < heaters.length && heaters[heaterIndex] !== null)
		.map(heaterIndex => heaters[heaterIndex]);
	return (toolHeaters.length > 0) ? toolHeaters : [null];
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

async function toolHeaterClick(tool: Tool, heater: Heater) {
	if (disabled.value || isToolBusy(tool)) {
		return;
	}

	switch (heater.state) {
		case HeaterState.off:
			await machineStore.sendCode(`M568 P${tool.number} A2`);
			break;
		case HeaterState.standby:
			await machineStore.sendCode(`M568 P${tool.number} A0`);
			break;
		case HeaterState.active:
			await machineStore.sendCode(`M568 P${tool.number} A1`);
			break;
		case HeaterState.fault:
			emit("resetHeaterFault", machineStore.model.heat.heaters.indexOf(heater));
			break;
	}
}

function getSpindle(tool: Tool): Spindle | null {
	return (tool.spindle >= 0 && tool.spindle < machineStore.model.spindles.length) ? machineStore.model.spindles[tool.spindle] : null;
}

function getSpindleSpeed(tool: Tool): number {
	const spindle = getSpindle(tool);
	return (spindle !== null && spindle.current !== null) ? ((spindle.state === SpindleState.reverse) ? -spindle.current : spindle.current) : 0;
}
</script>
