<style scoped>
table {
	width: 100%;
	border-spacing: 0;
}

table td,
table th {
	text-align: center;
}

table.tools th,
table.tools td {
	width: 20%;
}

table.extra th,
table.extra td {
	width: 25%;
}

table.extra tr > th:first-child,
table.extra tr > td:first-child {
	width: 50%;
}
</style>

<template>
	<v-card>
		<v-card-title class="py-2">
			<panel-link :active="showToolsPage" @click="showToolsPage = true" class="mr-2">
				<v-icon small>mdi-wrench</v-icon>
				{{ $t("panel.tools.caption") }}
			</panel-link>
			<panel-link :active="!showToolsPage" @click="showToolsPage = false">
				<v-icon small>mdi-plus</v-icon>
				{{ $t("panel.tools.extra.caption") }}
			</panel-link>

			<v-spacer />

			<!-- Control All dropdown -->
			<v-menu v-model="dropdownShown" left offset-y :close-on-content-click="false">
				<template #activator="{ on }">
					<a v-on="on" href="javascript:void(0)">
						<v-icon small>mdi-menu-down</v-icon>
						{{ $t("panel.tools.controlHeaters") }}
					</a>
				</template>

				<v-card>
					<v-layout justify-center column class="pt-2 pb-3 px-2">
						<v-btn block color="primary" class="mb-3 pa-2" :disabled="!canTurnEverythingOff"
							   @click="turnEverythingOff">
							<v-icon class="mr-1">mdi-power-standby</v-icon>
							{{ $t("panel.tools.turnEverythingOff") }}
						</v-btn>

						<v-divider class="mb-2" />

						<tool-input ref="allActive" :label="$t('panel.tools.setActiveTemperatures')" all active
									:control-tools="controlTools" :control-beds="controlBeds"
									:control-chambers="controlChambers" />
						<tool-input :label="$t('panel.tools.setStandbyTemperatures')" all standby
									:control-tools="controlTools" :control-beds="controlBeds"
									:control-chambers="controlChambers" />

						<v-switch v-show="hasTools" v-model="controlTools" hide-details class="mx-1 mt-0"
								  :label="$t('panel.tools.setToolTemperatures')" />
						<v-switch v-show="hasBeds" v-model="controlBeds" hide-details class="mx-1"
								  :label="$t('panel.tools.setBedTemperatures')" />
						<v-switch v-show="hasChambers" v-model="controlChambers" hide-details class="mx-1"
								  :label="$t('panel.tools.setChamberTemperatures')" />
					</v-layout>
				</v-card>
			</v-menu>
		</v-card-title>

		<v-card-text class="pa-0">
			<!-- Tool List -->
			<template v-if="showToolsPage">
				<table v-if="hasTools || hasBeds || hasChambers" class="tools">
					<thead>
						<tr>
							<th class="pl-2">
								{{ $t("panel.tools.tool", [""]) }}
							</th>
							<th class="px-1">
								{{ $t("panel.tools.heater", [""]) }}
							</th>
							<th class="px-1">
								{{ $t("panel.tools.current", [""]) }}
							</th>
							<th class="px-1">
								{{ $t("panel.tools.active") }}
							</th>
							<th class="pr-2">
								{{ $t("panel.tools.standby") }}
							</th>
						</tr>
					</thead>
					<tbody>
						<!-- Tools -->
						<template v-for="(tool, toolIndex) in validTools">
							<!-- Tool -->
							<tr v-for="(toolHeater, toolHeaterIndex) in getToolHeaters(tool)"
								:key="`tool-${tool.number}-${toolHeaterIndex}`"
								:class="{ [selectedToolClass]: (tool.number === model.state.currentTool) }">
								<!-- Tool Name -->
								<th v-if="toolHeaterIndex === 0" :rowspan="Math.max(1, tool.heaters.length)"
									class="pl-2" :class="{ 'pt-2 pb-2': !tool.heaters.length && !toolHeater }">
									<a href="javascript:void(0)" @click="toolClick(tool)">
										{{ tool.name || $t("panel.tools.tool", [tool.number]) }}
									</a>
									<br>
									<span class="font-weight-regular caption">
										T{{ tool.number }}

										<template v-if="isConnected && canLoadFilament(tool)">
											-
											<v-menu v-if="getFilament(tool)" offset-y auto>
												<template #activator="{ on }">
													<a v-on="on" @click="filamentMenu.tool = tool"
													   href="javascript:void(0)" class="font-weight-regular">
														{{ getFilament(tool) }}
													</a>
												</template>

												<v-list>
													<v-list-item @click="filamentMenu.dialogShown = true">
														<v-icon class="mr-1">mdi-swap-vertical</v-icon>
														{{ $t("panel.tools.changeFilament") }}
													</v-list-item>
													<v-list-item @click="unloadFilament">
														<v-icon class="mr-1">mdi-arrow-up</v-icon>
														{{ $t("panel.tools.unloadFilament") }}
													</v-list-item>
												</v-list>
											</v-menu>
											<a v-else href="javascript:void(0)"
											   @click="filamentMenu.tool = tool; filamentMenu.dialogShown = true">
												{{ $t("panel.tools.loadFilament") }}
											</a>
										</template>
									</span>
								</th>

								<template v-if="!toolHeater && getSpindle(tool)">
									<!-- Spindle Name -->
									<td>
										<template v-if="tool.number === model.state.currentTool">
											<v-row dense>
												<v-col>
													<code-btn code="M4" no-wait small>
														<v-icon>mdi-rotate-left</v-icon>
													</code-btn>
													<code-btn code="M3" no-wait small>
														<v-icon>mdi-rotate-right</v-icon>
													</code-btn>
												</v-col>
											</v-row>
											<v-row dense>
												<v-col>
													<code-btn code="M5" no-wait small>
														<v-icon>mdi-stop</v-icon>
													</code-btn>
												</v-col>
											</v-row>
										</template>
									</td>

									<!-- Current RPM -->
									<td class="text-center">
										{{ $display(getSpindleSpeed(tool), 0, $t("generic.rpm")) }}
									</td>

									<!-- Active RPM -->
									<td>
										<tool-input :tool="tool" :spindle="getSpindle(tool)"
													:spindle-index="tool.spindle" active />
									</td>

									<!-- Standby RPM -->
									<td>
										<!-- unused -->
									</td>
								</template>
								<template v-else>
									<!-- Heater Name -->
									<th>
										<template v-if="toolHeater">
											<a href="javascript:void(0)" @click="toolHeaterClick(tool, toolHeater)"
											   :class="getHeaterColor(tool.heaters[toolHeaterIndex])">
												{{ getHeaterName(toolHeater, tool.heaters[toolHeaterIndex]) }}
											</a>
											<template v-if="toolHeater.state !== null">
												<br>
												<span class="font-weight-regular caption">
													{{ $t(`generic.heaterStates.${toolHeater.state}`) }}
												</span>
											</template>
										</template>
										<span v-else>
											{{ $t("generic.noValue") }}
										</span>
									</th>

									<!-- Heater value -->
									<td>
										{{ getHeaterValue(toolHeater) }}
									</td>

									<!-- Heater active -->
									<td class="pl-2 pr-1">
										<tool-input :tool="tool" :tool-heater-index="toolHeaterIndex" active />
									</td>

									<!-- Heater standby -->
									<td class="pl-1 pr-2">
										<tool-input :tool="tool" :tool-heater-index="toolHeaterIndex" standby />
									</td>
								</template>
							</tr>

							<!-- Divider -->
							<tr v-if="toolIndex < validTools.length - 1" :key="`div-tool-${toolIndex}`">
								<td colspan="5">
									<v-divider />
								</td>
							</tr>
						</template>

						<!-- Beds -->
						<template v-for="(bedHeater, bedIndex) in bedHeaters">
							<template v-if="bedHeater !== null">
								<!-- Divider -->
								<tr v-if="validTools.length > 0" :key="`div-bed-${bedIndex}`">
									<td colspan="5">
										<v-divider />
									</td>
								</tr>

								<!-- Bed -->
								<tr :key="`bed-${bedIndex}-0`">
									<!-- Bed name -->
									<th class="pl-2">
										<a href="javascript:void(0)" @click="bedHeaterClick(bedHeater, bedIndex)">
											{{ $t("panel.tools.bed", [hasOneBed ? "" : bedIndex]) }}
										</a>
									</th>

									<!-- Heater name -->
									<th>
										<a href="javascript:void(0)" @click="bedHeaterClick(bedHeater, bedIndex)"
										   :class="getHeaterColor(model.heat.bedHeaters[bedIndex])">
											{{ getHeaterName(bedHeater, model.heat.bedHeaters[bedIndex]) }}
										</a>
										<br>
										<span class="font-weight-regular caption">
											{{ $t(`generic.heaterStates.${bedHeater.state}`) }}
										</span>
									</th>

									<!-- Heater value -->
									<td>
										{{ getHeaterValue(bedHeater) }}
									</td>

									<!-- Heater active -->
									<td class="pl-2 pr-1">
										<tool-input :bed="bedHeater" :bed-index="bedIndex" active />
									</td>

									<!-- Heater standby -->
									<td class="pl-1 pr-2">
										<tool-input :bed="bedHeater" :bed-index="bedIndex" standby />
									</td>
								</tr>
							</template>
						</template>

						<!-- Chambers -->
						<template v-for="(chamberHeater, chamberIndex) in chamberHeaters">
							<template v-if="chamberHeater">
								<!-- Divider -->
								<tr :key="`div-chamber-${chamberIndex}`">
									<td colspan="5">
										<v-divider />
									</td>
								</tr>

								<!-- Chamber -->
								<tr :key="`chamber-${chamberIndex}-0`">
									<!-- Chamber name -->
									<th class="pl-2">
										<a href="javascript:void(0)"
										   @click="chamberHeaterClick(chamberHeater, chamberIndex)">
											{{ $t("panel.tools.chamber", [hasOneChamber ? "" : chamberIndex]) }}
										</a>
									</th>

									<!-- Heater name -->
									<th>
										<a href="javascript:void(0)"
										   @click="chamberHeaterClick(chamberHeater, chamberIndex)"
										   :class="getHeaterColor(model.heat.chamberHeaters[chamberIndex])">
											{{ getHeaterName(chamberHeater, model.heat.chamberHeaters[chamberIndex]) }}
										</a>
										<br>
										<span class="font-weight-regular caption">
											{{ $t(`generic.heaterStates.${chamberHeater.state}`) }}
										</span>
									</th>

									<!-- Heater value -->
									<td>
										{{ getHeaterValue(chamberHeater) }}
									</td>

									<!-- Heater active -->
									<td class="pl-2 pr-1">
										<tool-input :chamber="chamberHeater" :chamber-index="chamberIndex" active />
									</td>

									<!-- Heater standby -->
									<td class="pl-1 pr-2">
										<tool-input :chamber="chamberHeater" :chamber-index="chamberIndex" standby />
									</td>
								</tr>
							</template>
						</template>
					</tbody>
				</table>
				<v-alert v-else :value="true" type="info" class="mb-0">
					{{ $t("panel.tools.noTools") }}
				</v-alert>

				<reset-heater-fault-dialog :shown.sync="resetHeaterFault" :heater="faultyHeater" />
				<filament-dialog :shown.sync="filamentMenu.dialogShown" :tool="filamentMenu.tool" />
			</template>
			<template v-else>
				<table v-if="extraSensors.length > 0" class="extra ml-2 mr-2">
					<thead>
						<tr>
							<th class="hidden-sm-and-down"></th>
							<th>
								{{ $t("panel.tools.extra.sensor") }}
							</th>
							<th>
								{{ $t("panel.tools.extra.value") }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="extraSensor in extraSensors" :key="`extra-${extraSensor.index}`">
							<td class="hidden-sm-and-down">
								<v-switch class="ml-3"
										  :input-value="displayedExtraTemperatures.indexOf(extraSensor.index) !== -1"
										  @change="toggleExtraVisibility(extraSensor.index)"
										  :label="$t('panel.tools.extra.showInChart')" :disabled="uiFrozen" />
							</td>
							<th class="py-2" :class="getExtraColor(extraSensor.index)">
								{{ formatExtraName(extraSensor) }}
							</th>
							<td class="py-2">
								{{ formatSensorValue(extraSensor.sensor) }}
							</td>
						</tr>
					</tbody>
				</table>
				<v-alert v-else :value="true" type="info">
					{{ $t("panel.tools.extra.noItems") }}
				</v-alert>
			</template>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import ObjectModel, { AnalogSensor, AnalogSensorType, Heater, HeaterState, Spindle, SpindleState, Tool } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";
import { getHeaterColor, getExtraColor } from "@/utils/colors";
import { DisconnectedError, getErrorMessage } from "@/utils/errors";
import { LogType } from "@/utils/logging";

export default Vue.extend({
	computed: {
		isConnected(): boolean { return store.getters["isConnected"]; },
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		toolChangeParameter(): string { return store.getters["machine/settings/toolChangeParameter"]; },
		model(): ObjectModel { return store.state.machine.model; },
		displayedExtraTemperatures(): Array<number> { return store.state.machine.settings.displayedExtraTemperatures; },
		darkTheme(): boolean { return store.state.settings.darkTheme; },
		canTurnEverythingOff(): boolean {
			const heaters = this.model.heat.heaters;
			return (!this.uiFrozen &&
				this.model.tools.some((tool) => (tool !== null) && tool.heaters.some(toolHeater => (toolHeater >= 0) && (toolHeater < heaters.length) && (heaters[toolHeater] !== null) && (heaters[toolHeater]!.state !== HeaterState.off))) ||
				this.model.heat.bedHeaters.some((bedHeater) => (bedHeater >= 0) && (bedHeater < heaters.length) && (heaters[bedHeater] !== null) && (heaters[bedHeater]!.state !== HeaterState.off)) ||
				this.model.heat.chamberHeaters.some(chamberHeater => (chamberHeater >= 0) && (chamberHeater < heaters.length) && (heaters[chamberHeater] && heaters[chamberHeater]!.state !== HeaterState.off)));
		},
		hasTools(): boolean {
			return this.model.tools.some(tool => tool !== null);
		},
		hasBeds(): boolean {
			return this.model.heat.bedHeaters.some(bedHeater => (bedHeater >= 0) && (bedHeater < this.model.heat.heaters.length) && (this.model.heat.heaters[bedHeater] !== null));
		},
		hasChambers(): boolean {
			return this.model.heat.chamberHeaters.some(chamberHeater => (chamberHeater >= 0) && (chamberHeater < this.model.heat.heaters.length) && (this.model.heat.heaters[chamberHeater] !== null));
		},
		validTools(): Array<Tool> {
			return this.model.tools.filter(tool => tool !== null) as Array<Tool>;
		},
		selectedToolClass(): string {
			return this.darkTheme ? "grey darken-3" : "blue lighten-5";
		},
		extraSensors(): Array<{ sensor: AnalogSensor, index: number }> {
			const heaters = this.model.heat.heaters;
			return this.model.sensors.analog
				.filter((sensor, index) => (sensor !== null) && !heaters.some(heater => (heater !== null) && (heater.sensor === index)))
				.map((sensor, index) => ({
					sensor,
					index
				})) as Array<{ sensor: AnalogSensor, index: number }>;
		},
		bedHeaters(): Array<Heater | null> {
			const heaters = this.model.heat.heaters;
			return this.model.heat.bedHeaters.map(heaterIndex => (heaterIndex >= 0 && heaterIndex < heaters.length && heaters[heaterIndex]) ? heaters[heaterIndex] : null);
		},
		hasOneBed(): boolean {
			return this.bedHeaters.filter(bed => (bed !== null)).length === 1;
		},
		chamberHeaters(): Array<Heater | null> {
			const heaters = this.model.heat.heaters;
			return this.model.heat.chamberHeaters.map(heaterIndex => (heaterIndex >= 0 && heaterIndex < heaters.length && heaters[heaterIndex]) ? heaters[heaterIndex] : null);
		},
		hasOneChamber(): boolean {
			return this.chamberHeaters.filter(chamber => (chamber !== null)).length === 1;
		}
	},
	data() {
		return {
			dropdownShown: false,
			turningEverythingOff: false,
			controlTools: true,
			controlBeds: false,
			controlChambers: false,

			showToolsPage: true,
			waitingForCode: false,

			loadingFilament: false,
			filamentMenu: {
				tool: null as Tool | null,
				dialogShown: false
			},

			resetHeaterFault: false,
			faultyHeater: -1
		}
	},
	methods: {
		toggleExtraVisibility(sensor: number) {
			store.commit("machine/settings/toggleExtraVisibility", sensor);
		},

		// Control All Drop-Down
		showDropdown() {
			this.dropdownShown = !this.dropdownShown;
			if (this.dropdownShown) {
				const input = (this.$refs.allActive as HTMLInputElement);
				setTimeout(() => input.focus(), 300);
			}
		},
		async turnEverythingOff() {
			let code = "";
			for (const tool of this.model.tools) {
				if ((tool !== null) && (tool.heaters.length > 0)) {
					code += `M568 P${tool.number} A0\n`;
				}
			}
			this.model.heat.bedHeaters.forEach((bedHeater, index) => {
				if (bedHeater >= -1 && bedHeater < this.model.heat.heaters.length) {
					code += `M140 P${index} S-273.15\n`;
				}
			}, this);
			this.model.heat.chamberHeaters.forEach((chamberHeater, index) => {
				if (chamberHeater >= -1 && chamberHeater < this.model.heat.heaters.length) {
					code += `M141 P${index} S-273.15\n`;
				}
			}, this);

			this.turningEverythingOff = true;
			try {
				await store.dispatch("machine/sendCode", code);
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					this.$log(LogType.error, this.$t("error.turnOffEverythingFailed"), getErrorMessage(e));
				}
			}
			this.turningEverythingOff = false;
		},

		// Heaters
		getHeaterColor(heaterIndex: number) { return getHeaterColor(heaterIndex) },
		getHeaterName(heater: Heater | null, heaterIndex: number) {
			if ((heater !== null) && (heater.sensor >= 0) && (heater.sensor < this.model.sensors.analog.length)) {
				const sensor = this.model.sensors.analog[heater.sensor];
				if ((sensor !== null) && sensor.name) {
					const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
					if (matches) {
						return matches[1];
					}
					return sensor.name;
				}
			}
			return this.$t("panel.tools.heater", [heaterIndex]);
		},
		getHeaterValue(heater: Heater | null) {
			if ((heater !== null) && (heater.sensor >= 0) && (heater.sensor < this.model.sensors.analog.length)) {
				const sensor = this.model.sensors.analog[heater.sensor];
				if (sensor !== null) {
					return this.formatSensorValue(sensor);
				}
			}
			return this.$t("generic.noValue");
		},
		formatSensorValue(sensor: AnalogSensor) {
			if (sensor.name) {
				const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
				if (matches) {
					return this.$display(sensor.lastReading, 1, matches[2]);
				}
			}
			const unit = (sensor.type === AnalogSensorType.dhtHumidity) ? "%RH" : "°C";
			return this.$display(sensor.lastReading, 1, unit);
		},

		// Tools
		async toolClick(tool: Tool) {
			if (!this.isConnected) {
				return;
			}

			this.waitingForCode = true;
			try {
				if (this.model.state.currentTool === tool.number) {
					// Deselect current tool
					await store.dispatch("machine/sendCode", "T-1" + this.toolChangeParameter);
				} else {
					// Select new tool
					await store.dispatch("macine/sendCode", `T${tool.number}${this.toolChangeParameter}`);
				}
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					this.$log(LogType.error, getErrorMessage(e));
				}
			}
			this.waitingForCode = false;
		},
		getFilament(tool: Tool) {
			if ((tool.filamentExtruder >= 0) && (tool.filamentExtruder < this.model.move.extruders.length)) {
				return this.model.move.extruders[tool.filamentExtruder].filament;
			}
			return null;
		},
		canLoadFilament(tool: Tool) {
			return !this.uiFrozen && (tool.filamentExtruder >= 0) && (tool.filamentExtruder < this.model.move.extruders.length);
		},
		async unloadFilament() {
			if (!this.isConnected || this.filamentMenu.tool === null) {
				return;
			}

			let code = "";
			if (this.model.state.currentTool !== this.filamentMenu.tool.number) {
				code = `T${this.filamentMenu.tool.number}\n`;
			}
			code += "M702";
			await store.dispatch("machine/sendCode", code);
		},

		getToolHeaters(tool: Tool) {
			const heaters = this.model.heat.heaters;
			const toolHeaters = tool.heaters
				.filter(heaterIndex => (heaterIndex >= 0) && (heaterIndex < heaters.length) && (heaters[heaterIndex] !== null))
				.map(heaterIndex => heaters[heaterIndex], this);
			return (toolHeaters.length > 0) ? toolHeaters : [null];
		},
		async toolHeaterClick(tool: Tool, heater: Heater) {
			if (!this.isConnected) {
				return;
			}

			switch (heater.state) {
				case HeaterState.off:		// Off -> Active
					await store.dispatch("machine/sendCode", `M568 P${tool.number} A2`);
					break;

				case HeaterState.standby:	// Standby -> Off
					await store.dispatch("machine/sendCode", `M568 P${tool.number} A0`);
					break;

				case HeaterState.active:	// Active -> Standby
					await store.dispatch("machine/sendCode", `M568 P${tool.number} A1`);
					break;

				case HeaterState.fault:		// Fault -> Ask for reset
					this.faultyHeater = this.model.heat.heaters.indexOf(heater);
					this.resetHeaterFault = true;
					break;
			}
		},

		getSpindle(tool: Tool) {
			return (tool.spindle >= 0) && (tool.spindle < this.model.spindles.length) ? this.model.spindles[tool.spindle] : null;
		},
		getSpindleSpeed(tool: Tool) {
			const spindle = this.getSpindle(tool);
			return spindle ? ((spindle.state === SpindleState.reverse) ? -spindle.current : spindle.current) : 0;
		},

		// Beds
		async bedHeaterClick(bedHeater: Heater, bedIndex: number) {
			if (!this.isConnected) {
				return;
			}

			switch (bedHeater.state) {
				case HeaterState.off:		// Off -> Active
					await store.dispatch("machine/sendCode", `M140 P${bedIndex} S${bedHeater.active}`);
					break;

				case HeaterState.standby:	// Standby -> Off
					await store.dispatch("machine/sendCode", `M140 P${bedIndex} S-273.15`);
					break;

				case HeaterState.active:	// Active -> Standby
					await store.dispatch("machine/sendCode", `M144 P${bedIndex}`);
					break;

				case HeaterState.fault:		// Fault -> Ask for reset
					this.faultyHeater = this.model.heat.heaters.indexOf(bedHeater);
					this.resetHeaterFault = true;
					break;
			}
		},

		// Chambers
		async chamberHeaterClick(chamberHeater: Heater, chamberIndex: number) {
			if (!this.isConnected) {
				return;
			}

			switch (chamberHeater.state) {
				case HeaterState.off:		// Off -> Active
					await store.dispatch("machine/sendCode", `M141 P${chamberIndex} S${chamberHeater.active}`);
					break;

				// Standby mode for chambers is not officially supported yet (there"s no code for standby control)

				case HeaterState.fault:		// Fault -> Ask for reset
					this.faultyHeater = this.model.heat.heaters.indexOf(chamberHeater);
					this.resetHeaterFault = true;
					break;

				default:	// Active -> Off
					await store.dispatch("machine/sendCode", `M141 P${chamberIndex} S-273.15`);
					break;
			}
		},

		// Extra
		getExtraColor(sensorIndex: number) { return getExtraColor(sensorIndex) },
		formatExtraName(sensor: { sensor: AnalogSensor, index: number }) {
			if (sensor.sensor.name) {
				const matches = /(.*)\[(.*)\]$/.exec(sensor.sensor.name);
				if (matches) {
					return matches[1];
				}
				return sensor.sensor.name;
			}
			return this.$t("panel.tools.extra.sensorIndex", [sensor.index]);
		}
	}
});
</script>
