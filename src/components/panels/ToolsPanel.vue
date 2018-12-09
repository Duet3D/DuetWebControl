<style scoped>
a:not(:hover) {
	text-decoration: none;
}

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
	<v-card v-auto-size>
		<v-card-title class="py-2">
			<panel-link :active="currentPage !== 'tools'" @click="currentPage = 'tools'" class="mr-2">
				<v-icon small>build</v-icon> {{ $t('panel.tools.caption') }}
			</panel-link>
			<panel-link :active="currentPage !== 'extra'" @click="currentPage = 'extra'">
				<v-icon small>timeline</v-icon> {{ $t('panel.tools.extra.caption') }}
			</panel-link>

			<v-spacer></v-spacer>

			<v-menu offset-y left open-on-hover :close-on-content-click="false">
				<a href="#" slot="activator" @click.prevent="">
					<v-icon small>more_horiz</v-icon> {{ $t('panel.tools.controlAll') }}
				</a>
				<v-card>
					<v-layout justify-center column class="pt-2 px-2">
						<v-btn block color="primary" class="all-off mb-3 pa-2" :disabled="!canTurnEverythingOff" @click="turnEverythingOff">
							<v-icon>power_off</v-icon> {{ $t('panel.tools.turnEverythingOff') }}
						</v-btn>

						<label>Set all active temperatures to:</label>
						<tool-input all active></tool-input>
						<label>Set all standby temperatures to:</label>
						<tool-input all standby></tool-input>
					</v-layout>
				</v-card>
			</v-menu>
		</v-card-title>

		<v-card-text class="pa-0">
			<template v-if="currentPage === 'tools'">
				<!-- Tools -->
				<table class="tools">
					<thead>
						<th class="pl-2">{{ $t('panel.tools.tool', ['']) }}</th>
						<th>{{ $t('panel.tools.heater', ['']) }}</th>
						<th>{{ $t('panel.tools.current', ['']) }}</th>
						<th>{{ $t('panel.tools.active') }}</th>
						<th class="pr-2">{{ $t('panel.tools.standby') }}</th>
					</thead>
					<tbody>
						<template v-for="(tool, index) in tools">
							<tr :class="{ 'grey lighten-4' : tool.number === state.currentTool }" :key="`tool-${index}-${tool.heaters.length && tool.heaters[0]}`">
								<th :rowspan="Math.max(1, tool.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !tool.heaters.length}">
									<a href="#" @click.prevent="toolClick(tool)">
										{{ tool.name || $t('panel.tools.tool', [tool.number]) }}
									</a>
									<br/>
									<span class="font-weight-regular caption">
										T{{ tool.number }}
										<template v-if="canLoadFilament(tool)">
											- <panel-link :active="!loadingFilament" class="font-weight-regular" href="#" @click="filamentClick($event, tool)">
												{{ tool.filament ? tool.filament : $t('panel.tools.loadFilament') }}
											</panel-link>
										</template>
									</span>
								</th>

								<th>
									<a v-if="tool.heaters.length" href="#" :class="getHeaterColor(tool.heaters[0])" @click.prevent="toolHeaterClick(tool, tool.heaters[0])">
										{{ getHeaterName(heat.heaters[tool.heaters[0]].name, tool.heaters[0]) }}
									</a>
									<br/>
									<span v-if="tool.heaters.length && heat.heaters[tool.heaters[0]].state !== undefined" class="font-weight-regular caption">
										{{ $t(`generic.heaterStates[${heat.heaters[tool.heaters[0]].state}]`) }}
									</span>
								</th>
								<td class="text-center">
									<span v-if="tool.heaters.length">
										{{ $display(heat.heaters[tool.heaters[0]].current, 1, getHeaterUnit(heat.heaters[tool.heaters[0]].name, heat.heaters[tool.heaters[0]].sensor)) }}
									</span>
									<span v-else-if="isNumber(tool.spindle)">
										{{ $display(spindles[tool.spindle].current, 0, $t('generic.rpm')) }}
									</span>
								</td>
								<td class="pl-2 pr-1">
									<tool-input v-if="tool.heaters.length" :tool="tool" :heaterIndex="0" active></tool-input>
									<tool-input v-else-if="isNumber(tool.spindle)" :spindle="spindles[tool.spindle]" active></tool-input>
								</td>
								<td class="pl-1 pr-2">
									<tool-input v-if="tool.heaters.length" :tool="tool" :heaterIndex="0" standby></tool-input>
								</td>
							</tr>

							<tr v-for="(heater, heaterIndex) in tool.heaters.slice(1)" :class="{ 'grey lighten-4' : tool.number === state.currentTool }" :key="`tool-${index}-${heater}`">
								<th>
									<a href="#" :class="getHeaterColor(heater)" @click.prevent="toolHeaterClick(tool, heater)">
										{{ getHeaterName(heat.heaters[heater].name, heater) }}
									</a>
									<br/>
									<span v-if="heat.heaters[heater].state !== undefined" class="font-weight-regular caption">
										{{ $t(`generic.heaterStates[${heat.heaters[heater].state}]`) }}
									</span>
								</th>
								<td>
									{{ $display(heat.heaters[heater].current, 1, getHeaterUnit(heat.heaters[heater].name, heat.heaters[heater].sensor)) }}
								</td>
								<td class="pl-2 pr-1">
									<tool-input :tool="tool" :heaterIndex="heaterIndex + 1" active></tool-input>
								</td>
								<td class="pl-1 pr-2">
									<tool-input :tool="tool" :heaterIndex="heaterIndex + 1" standby></tool-input>
								</td>
							</tr>

							<tr v-if="index !== tools.length - 1" :key="`div-tool-${index}`">
								<td colspan="5">
									<v-divider></v-divider>
								</td>
							</tr>
						</template>

						<!-- Beds -->
						<template v-for="(bed, index) in heat.beds">
							<template v-if="bed">
								<tr :key="`div-bed-${index}`">
									<td colspan="5">
										<v-divider></v-divider>
									</td>
								</tr>

								<tr :key="`bed-${index}-${bed.heaters.length && bed.heaters[0]}`">
									<th :rowspan="Math.max(1, bed.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !bed.heaters.length}">
										<a href="#" @click.prevent="bedClick(bed)">
											{{ bed.name || $t('panel.tools.bed', [(heat.beds.length !== 1) ? index : '']) }}
										</a>
									</th>

									<th>
										<a v-if="bed.heaters.length" href="#" :class="getHeaterColor(bed.heaters[0])" @click.prevent="bedHeaterClick(bed, bed.heaters[0])">
											{{ getHeaterName(heat.heaters[bed.heaters[0]].name, bed.heaters[0]) }}
										</a>
										<br/>
										<span v-if="bed.heaters.length > 0 && heat.heaters[bed.heaters[0]].state !== undefined" class="font-weight-regular caption">
											{{ $t(`generic.heaterStates[${heat.heaters[bed.heaters[0]].state}]`) }}
										</span>
									</th>
									<td class="text-center">
										<span v-if="bed.heaters.length">
											{{ $display(heat.heaters[bed.heaters[0]].current, 1, getHeaterUnit(heat.heaters[bed.heaters[0]].name, heat.heaters[bed.heaters[0]].sensor)) }}
										</span>
									</td>
									<td class="pl-2 pr-1">
										<tool-input v-if="bed.heaters.length" :bed="bed" :bedIndex="0" :heaterIndex="0" active></tool-input>
									</td>
									<td class="pl-1 pr-2">
										<tool-input v-if="bed.heaters.length" :bed="bed" :bedIndex="0" :heaterIndex="0" standby></tool-input>
									</td>
								</tr>
								<tr v-for="(heater, heaterIndex) in bed.heaters.slice(1)" :key="`bed-${index}-${heater}`">
									<th>
										<a href="#" :class="getHeaterColor(heater)" @click.prevent="toolHeaterClick(tool, heater)">
											{{ getHeaterName(heat.heaters[heater].name, heater) }}
										</a>
										<br/>
										<span v-if="heat.heaters[heater].state !== undefined" class="font-weight-regular caption">
											{{ $t(`generic.heaterStates[${heat.heaters[heater].state}]`) }}
										</span>
									</th>
									<td>
										{{ $display(heat.heaters[heater].current, 1, getHeaterUnit(heat.heaters[heater].name, heat.heaters[heater].sensor)) }}
									</td>
									<td class="pl-2 pr-1">
										<tool-input :bed="bed" :bedIndex="index" :heaterIndex="heaterIndex + 1" active></tool-input>
									</td>
									<td class="pl-1 pr-2">
										<tool-input :bed="bed" :bedIndex="index" :heaterIndex="heaterIndex + 1" standby></tool-input>
									</td>
								</tr>
							</template>
						</template>

						<!-- Chambers -->
						<template v-for="(chamber, index) in heat.chambers">
							<template v-if="chamber">
								<tr :key="`div-${index}`">
									<td colspan="5">
										<v-divider></v-divider>
									</td>
								</tr>

								<tr :key="`chamber-${index}-${chamber.heaters.length && chamber.heaters[0]}`">
									<th :rowspan="Math.max(1, chamber.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !chamber.heaters.length}">
										<a href="#" @click.prevent="chamberClick(chamber)">
											{{ chamber.name || $t('panel.tools.chamber', [(heat.chambers.length !== 1) ? index : '']) }}
										</a>
									</th>

									<th>
										<a v-if="chamber.heaters.length > 0" href="#" :class="getHeaterColor(chamber.heaters[0])" @click.prevent="chamberHeaterClick(chamber, chamber.heaters[0])">
											{{ getHeaterName(heat.heaters[chamber.heaters[0]].name, chamber.heaters[0]) }}
										</a>
										<br/>
										<span v-if="chamber.heaters.length > 0 && heat.heaters[chamber.heaters[0]].state !== undefined" class="font-weight-regular caption">
											{{ $t(`generic.heaterStates[${heat.heaters[chamber.heaters[0]].state}]`) }}
										</span>
									</th>
									<td class="text-center">
										<span v-if="chamber.heaters.length > 0">
											{{ $display(heat.heaters[chamber.heaters[0]].current, 1, getHeaterUnit(heat.heaters[chamber.heaters[0]].name, heat.heaters[chamber.heaters[0]].sensor)) }}
										</span>
									</td>
									<td class="pl-2 pr-1">
										<tool-input v-if="chamber.heaters.length > 0" :chamber="chamber" :chamberIndex="index" :heaterIndex="0" active></tool-input>
									</td>
									<td class="pl-1 pr-2">
										<!--<tool-input v-if="chamber.heaters.length > 0" :chamber="chamber" :chamberIndex="index" :heaterIndex="0" standby></tool-input>-->
									</td>
								</tr>
								<tr v-for="(heater, heaterIndex) in chamber.heaters.slice(1)" :key="`chamber-${index}-${heater}`">
									<th>
										<a href="#" :class="getHeaterColor(heater)" @click.prevent="toolHeaterClick(tool, heater)">
											{{ getHeaterName(heat.heaters[heater].name, heater) }}
										</a>
										<br/>
										<span v-if="heat.heaters[heater].state !== undefined" class="font-weight-regular caption">
											{{ $t(`generic.heaterStates[${heat.heaters[heater].state}]`) }}
										</span>
									</th>
									<td>
										{{ $display(heat.heaters[heater].current, 1, getHeaterUnit(heat.heaters[heater].name, heat.heaters[heater].sensor)) }}
									</td>
									<td class="pl-2 pr-1">
										<tool-input :chamber="chamber" :chamberIndex="index" :heaterIndex="heaterIndex + 1" active></tool-input>
									</td>
									<td class="pl-1 pr-2">
										<!--<tool-input :chamber="chamber" :chamberIndex="index" :heaterIndex="heaterIndex + 1" standby></tool-input>-->
									</td>
								</tr>
							</template>
						</template>
					</tbody>
				</table>

				<reset-heater-fault-dialog :shown.sync="resetHeaterFault" :heater="faultyHeater"></reset-heater-fault-dialog>

				<v-menu v-model="filamentMenu.shown" :activator="filamentMenu.target" offset-y auto>
					<v-list>
						<v-list-tile @click="filamentMenu.dialogShown = true">
							<v-icon class="mr-1">swap_vert</v-icon> {{ $t('panel.tools.changeFilament') }}
						</v-list-tile>
						<v-list-tile @click="unloadFilament">
							<v-icon class="mr-1">arrow_upward</v-icon> {{ $t('panel.tools.unloadFilament') }}
						</v-list-tile>
					</v-list>
				</v-menu>
				<filament-dialog :shown.sync="filamentMenu.dialogShown" :tool="filamentMenu.tool"></filament-dialog>
			</template>

			<template v-else-if="currentPage === 'extra'">
				<table class="extra ml-2 mr-2">
					<thead>
						<th></th>
						<th>{{ $t('panel.tools.extra.sensor') }}</th>
						<th>{{ $t('panel.tools.extra.value') }}</th>
					</thead>
					<tbody>
						<tr v-for="(extraHeater, index) in heat.extra" :key="`extra-${index}`">
							<td>
								<v-switch class="ml-3" :value="machineUI.displayedExtraTemperatures.indexOf(index) !== -1" @change="setExtraHeaterVisibility({ machine: selectedMachine, index, visible: $event })" :label="$t('panel.tools.extra.showInChart')" :disabled="frozen"></v-switch>
							</td>
							<th :class="getExtraHeaterColor(index)">
								{{ getHeaterName(extraHeater.name, index) }}
							</th>
							<td>
								{{ $display(extraHeater.current, 1, getHeaterUnit(extraHeater.name, extraHeater.sensor)) }}
							</td>
						</tr>
					</tbody>
				</table>
			</template>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapGetters, mapState, mapMutations, mapActions } from 'vuex'

import { getHeaterColor, getExtraHeaterColor } from '../../utils/colors.js'
import { DisconnectedError } from '../../utils/errors.js'

export default {
	computed: {
		...mapGetters(['isConnected']),
		...mapGetters('ui', ['frozen', 'machineUI']),
		...mapState(['selectedMachine']),
		...mapState('machine', ['heat', 'state', 'spindles', 'tools']),
		canTurnEverythingOff() {
			return !this.frozen && this.heat.heaters.some(heater => heater.state);
		}
	},
	data() {
		return {
			currentPage: 'tools',
			turningEverythingOff: false,
			waitingForCode: false,

			loadingFilament: false,
			filamentMenu: {
				shown: false,
				tool: undefined,
				target: undefined,
				dialogShown: false
			},

			resetHeaterFault: false,
			faultyHeater: -1
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		...mapMutations('ui', ['setExtraHeaterVisibility']),
		async turnEverythingOff() {
			let code = '';
			this.tools.forEach(function(tool) {
				if (tool.heaters.length) {
					const temps = tool.heaters.map(() => '-273.15').reduce((a, b) => a + ':' + b);
					code += `G10 P${tool.number} R${temps} S${temps}\n`;
				}
			});
			this.heat.beds.forEach(function(bed, index) {
				if (bed && bed.heaters.length) {
					code += `M140 P${index} S-273.15\n`;
				}
			});
			this.heat.chambers.forEach(function(chamber, index) {
				if (chamber && chamber.heaters.length) {
					code += `M141 P${index} S-273.15\n`;
				}
			});

			this.turningEverythingOff = true;
			try {
				await this.sendCode(code);
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					this.$log('error', this.$t('error.turnOffEverythingFailed'), e.message);
				}
			}
			this.turningEverythingOff = false;
		},

		getHeaterColor: heater => getHeaterColor(heater),
		getExtraHeaterColor: heater => getExtraHeaterColor(heater),

		getHeaterName(name, heater) {
			if (name) {
				const matches = /(.*)\[(.*)\]$/.exec(name);
				if (matches) {
					return matches[1];
				}
				return name;
			}
			return this.$t('panel.tools.heater', [heater]);
		},
		getHeaterUnit(name, sensor) {
			if (name) {
				const matches = /(.*)\[(.*)\]$/.exec(name);
				if (matches) {
					return matches[2];
				}
			}
			return (sensor >= 450 && sensor < 500) ? '%RH' : 'C';
		},

		canLoadFilament(tool) {
			// TODO enhance this using dedicate setting defining if the E count does not matter
			return !this.isFrozen && (tool.filament !== undefined) && (tool.extruders.length === 1);
		},
		filamentClick(e, tool) {
			this.filamentMenu.tool = tool;
			if (tool.filament) {
				this.filamentMenu.target = e.target;
				this.filamentMenu.shown = true;
			} else {
				this.filamentMenu.dialogShown = true;
			}
		},
		unloadFilament() {
			let code = '';
			if (this.state.currentTool === this.filamentMenu.tool.number) {
				code = `T${this.filamentMenu.tool.number}\n`;
			}
			code += 'M702';
			this.sendCode(code);
		},

		toolClick(tool) {
			if (!this.isConnected) {
				return;
			}

			this.waitingForCode = true;
			try {
				if (this.state.currentTool === tool.number) {
					// Deselect current tool
					this.sendCode('T-1');
				} else {
					// Select new tool
					this.sendCode(`T${tool.number}`);
				}
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					this.$log('error', e.message);
				}
			}
			this.waitingForCode = false;
		},
		toolHeaterClick(tool, heater) {
			if (!this.isConnected) {
				return;
			}

			switch (this.heat.heaters[heater].state) {
				case 0:		// Off -> Active
					this.sendCode(`T${tool.number}`);
					break;

				case 1:		// Standby -> Off
					const offTemps = tool.active.map(active => '-273.15').reduce((a, b) => `${a}:${b}`);
					this.sendCode(`G10 P${tool.number} S${offTemps} R${offTemps}`);
					break;

				case 2:		// Active -> Standby
					this.sendCode('T-1');
					break;

				case 3:		// Fault -> Ask for reset
					this.faultyHeater = heater;
					this.resetHeaterFault = true;
					break;
			}
		},

		bedClick(bed) {
			if (bed.heaters.length) {
				// There is no special action for clicking Bed yet
				this.bedHeaterClick(bed, bed.heaters[0]);
			}
		},
		bedHeaterClick(bed, heater) {
			if (!this.isConnected) {
				return;
			}

			switch (this.heat.heaters[heater].state) {
				case 0:		// Off -> Active
					const activeTemps = (bed.active instanceof Array) ? bed.active.reduce((a, b) => `${a}:${b}`) : bed.active;
					this.sendCode(`M140 P${bed.number} S${activeTemps}`);
					break;

				case 1:		// Standby -> Off
					const offTemps = (bed.active instanceof Array) ? bed.active.map(active => '-273.15').reduce((a, b) => `${a}:${b}`) : '-273.15';
					this.sendCode(`M140 P${bed.number} S${offTemps}`);
					break;

				case 2:		// Active -> Standby
					this.sendCode(`M144 P${bed.number}`);
					break;

				case 3:		// Fault -> Ask for reset
					this.faultyHeater = heater;
					this.resetHeaterFault = true;
					break;
			}
		},

		chamberClick(chamber) {
			if (chamber.heaters.length) {
				// There is no special action for clicking Chamber yet
				this.chamberHeaterClick(chamber, chamber.heaters[0]);
			}
		},
		chamberHeaterClick(chamber, heater) {
			if (!this.isConnected) {
				return;
			}

			switch (this.heat.heaters[heater].state) {
				case 0:		// Off -> Active
					const activeTemps = (chamber.active instanceof Array) ? chamber.active.reduce((a, b) => `${a}:${b}`) : chamber.active;
					this.sendCode(`M141 P${chamber.number} S${activeTemps}`);
					break;

				// Standby mode for chambers is not officially supported yet (there's no code for standby control)

				case 3:		// Fault -> Ask for reset
					this.faultyHeater = heater;
					this.resetHeaterFault = true;
					break;

				default:	// Active -> Off
					const offTemps = (chamber.active instanceof Array) ? chamber.active.map(active => '-273.15').reduce((a, b) => `${a}:${b}`) : '-273.15';
					this.sendCode(`M141 P${chamber.number} S${offTemps}`);
					break;
			}
		}
	}
}
</script>
