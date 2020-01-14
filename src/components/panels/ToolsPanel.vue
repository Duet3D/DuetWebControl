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
			<panel-link :active="currentPage !== 'tools'" @click="currentPage = 'tools'" class="mr-2">
				<v-icon small>mdi-wrench</v-icon> {{ $t('panel.tools.caption') }}
			</panel-link>
			<panel-link :active="currentPage !== 'extra'" @click="currentPage = 'extra'">
				<v-icon small>mdi-plus</v-icon> {{ $t('panel.tools.extra.caption') }}
			</panel-link>

			<v-spacer></v-spacer>

			<v-menu v-model="dropdownShown" left offset-y :close-on-content-click="false">
				<template #activator="{ on }">
					<a v-on="on" href="javascript:void(0)">
						<v-icon small>mdi-menu-down</v-icon> {{ $t('panel.tools.controlAll') }}
					</a>
				</template>

				<v-card>
					<v-layout justify-center column class="pt-2 px-2">
						<v-btn block color="primary" class="mb-3 pa-2" :disabled="!canTurnEverythingOff" @click="turnEverythingOff">
							<v-icon class="mr-1">mdi-power-standby</v-icon> {{ $t('panel.tools.turnEverythingOff') }}
						</v-btn>

						<tool-input ref="allActive" :label="$t('panel.tools.allActiveTemperatures')" all active></tool-input>
						<tool-input :label="$t('panel.tools.allStandbyTemperatures')" all standby></tool-input>
					</v-layout>
				</v-card>
			</v-menu>
		</v-card-title>

		<v-card-text class="pa-0">
			<template v-if="currentPage === 'tools'">
				<!-- Tools -->
				<table class="tools" v-show="tools.length">
					<thead>
						<th class="pl-2">{{ $t('panel.tools.tool', ['']) }}</th>
						<th class="px-1">{{ $t('panel.tools.heater', ['']) }}</th>
						<th class="px-1">{{ $t('panel.tools.current', ['']) }}</th>
						<th class="px-1">{{ $t('panel.tools.active') }}</th>
						<th class="pr-2">{{ $t('panel.tools.standby') }}</th>
					</thead>
					<tbody>
						<template v-for="(tool, index) in tools">
							<!-- First tool row -->
							<tr :class="{ [selectedToolClass] : (tool.number === state.currentTool) }" :key="`tool-${index}-0`">
								<!-- Tool name -->
								<th :rowspan="Math.max(1, tool.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !tool.heaters.length && !isValidHeaterItem(tool) }">
									<a href="javascript:void(0)" @click="toolClick(tool)">
										{{ tool.name || $t('panel.tools.tool', [tool.number]) }}
									</a>
									<br>
									<span class="font-weight-regular caption">
										T{{ tool.number }}

										<template v-if="isConnected && canLoadFilament(tool)">
											-
											<v-menu v-if="tool.filament" offset-y auto>
												<template #activator="{ on }">
													<a v-on="on" @click="filamentMenu.tool = tool" href="javascript:void(0)" class="font-weight-regular">
														{{ tool.filament }}
													</a>
												</template>

												<v-list>
													<v-list-item @click="filamentMenu.dialogShown = true">
														<v-icon class="mr-1">mdi-swap-vertical</v-icon> {{ $t('panel.tools.changeFilament') }}
													</v-list-item>
													<v-list-item @click="unloadFilament">
														<v-icon class="mr-1">mdi-arrow-up</v-icon> {{ $t('panel.tools.unloadFilament') }}
													</v-list-item>
												</v-list>
											</v-menu>
											<a v-else href="javascript:void(0)" @click="filamentMenu.tool = tool; filamentMenu.dialogShown = true">
												{{ $t('panel.tools.loadFilament') }}
											</a>
										</template>
									</span>
								</th>

								<!-- First heater name -->
								<th>
									<a href="javascript:void(0)" @click="toolHeaterClick(tool, tool.heaters[0])" :class="getHeaterColor(tool.heaters[0])">
										{{ formatHeaterName(tool, 0) }}
									</a>
									<template v-if="isValidHeaterItem(tool, 0) && heat.heaters[tool.heaters[0]].state !== null">
										<br>
										<span class="font-weight-regular caption">
											{{ $t(`generic.heaterStates[${heat.heaters[tool.heaters[0]].state}]`) }}
										</span>
									</template>
								</th>

								<!-- First heater/spindle value -->
								<td class="text-center">
									<span v-if="isValidHeaterItem(tool, 0)">
										{{ formatHeaterValue(heat.heaters[tool.heaters[0]]) }}
									</span>
									<span v-else-if="isValidToolSpindle(tool)">
										{{ $display(spindles[tool.spindle].current, 0, $t('generic.rpm')) }}
									</span>
									<span v-else>
										{{ $t('generic.noValue') }}
									</span>
								</td>

								<!-- First heater/spindle active -->
								<td class="pl-2 pr-1">
									<tool-input v-if="tool.heaters.length" :tool="tool" :heaterIndex="0" active></tool-input>
									<tool-input v-else-if="isNumber(tool.spindle) && tool.spindle >= 0" :spindle="spindles[tool.spindle]" active></tool-input>
								</td>

								<!-- First heater standby -->
								<td class="pl-1 pr-2">
									<tool-input v-if="tool.heaters.length" :tool="tool" :heaterIndex="0" standby></tool-input>
								</td>
							</tr>

							<!-- Following tool rows for tools with more than one heater -->
							<tr v-for="(heater, heaterIndex) in tool.heaters.slice(1)" :key="`tool-${index}-${heaterIndex + 1}`" :class="{ 'grey lighten-4' : tool.number === state.currentTool }" >
								<!-- Heater name -->
								<th>
									<template v-if="isValidHeaterItem(tool, heaterIndex)">
										<a href="javascript:void(0)" @click="toolHeaterClick(tool, heater)" :class="getHeaterColor(heater)">
											{{ formatHeaterName(tool, heaterIndex) }}
										</a>
										<template v-if="heat.heaters[heater].state !== null">
											<br>
											<span class="font-weight-regular caption">
												{{ $t(`generic.heaterStates[${heat.heaters[heater].state}]`) }}
											</span>
										</template>
									</template>
									<span v-else>
										{{ $t('generic.noValue') }}
									</span>
								</th>

								<!-- Heater value -->
								<td>
									<span v-if="isValidHeaterItem(tool, heaterIndex)">
										{{ formatHeaterValue(heat.heaters[heater]) }}
									</span>
									<span v-else>
										{{ $t('generic.noValue') }}
									</span>
								</td>

								<!-- Heater active -->
								<td class="pl-2 pr-1">
									<tool-input :tool="tool" :heaterIndex="heaterIndex + 1" active></tool-input>
								</td>

								<!-- Heater standby -->
								<td class="pl-1 pr-2">
									<tool-input :tool="tool" :heaterIndex="heaterIndex + 1" standby></tool-input>
								</td>
							</tr>

							<!-- Divider -->
							<tr v-if="index !== tools.length - 1" :key="`div-tool-${index}`">
								<td colspan="5">
									<v-divider></v-divider>
								</td>
							</tr>
						</template>

						<!-- Beds -->
						<template v-for="(bed, index) in heat.beds.filter(bed => bed !== null)">
							<!-- Divider -->
							<tr :key="`div-bed-${index}`">
								<td colspan="5">
									<v-divider></v-divider>
								</td>
							</tr>

							<!-- First bed row -->
							<tr :key="`bed-${index}-0`">
								<!-- Bed name -->
								<th :rowspan="Math.max(1, bed.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !bed.heaters.length}">
									<a href="javascript:void(0)" @click="bedClick(bed, index)">
										{{ bed.name || $t('panel.tools.bed', [(heat.beds.length !== 1) ? index : '']) }}
									</a>
								</th>

								<!-- First bed heater name -->
								<th>
									<a href="javascript:void(0)" @click="bedHeaterClick(bed, index, bed.heaters[0])" :class="getHeaterColor(bed.heaters[0])">
										{{ formatHeaterName(bed, 0) }}
									</a>
									<template v-if="heat.heaters[bed.heaters[0]].state !== null">
										<br>
										<span class="font-weight-regular caption">
											{{ $t(`generic.heaterStates[${heat.heaters[bed.heaters[0]].state}]`) }}
										</span>
									</template>
								</th>

								<!-- First bed heater value -->
								<td class="text-center">
									<span v-if="isValidHeaterItem(bed, 0)">
										{{ formatHeaterValue(heat.heaters[bed.heaters[0]]) }}
									</span>
									<span v-else>
										{{ $('generic.noValue') }}
									</span>
								</td>

								<!-- First bed heater active -->
								<td class="pl-2 pr-1">
									<tool-input v-if="bed.heaters.length" :bed="bed" :bedIndex="0" :heaterIndex="0" active></tool-input>
								</td>

								<!-- First bed heater standby -->
								<td class="pl-1 pr-2">
									<tool-input v-if="bed.standby.length" :bed="bed" :bedIndex="0" :heaterIndex="0" standby></tool-input>
								</td>
							</tr>

							<!-- Following bed rows for beds with more than one heater -->
							<tr v-for="(heater, heaterIndex) in bed.heaters.slice(1)" :key="`bed-${index}-${heaterIndex + 1}`">
								<!-- Heater name -->
								<th>
									<a href="javascript:void(0)" @click="bedHeaterClick(bed, index, heater)" :class="getHeaterColor(heater)">
										{{ formatHeaterName(bed, heaterIndex) }}
									</a>
									<template v-if="heat.heaters[heater].state !== null">
										<br>
										<span class="font-weight-regular caption">
											{{ $t(`generic.heaterStates[${heat.heaters[heater].state}]`) }}
										</span>
									</template>
								</th>

								<!-- Heater value -->
								<td>
									<span v-if="isValidHeaterItem(bed, heaterIndex)">
										{{ formatHeaterValue(heat.heaters[heater]) }}
									</span>
									<span v-else>
										{{ $t('generic.noValue') }}
									</span>
								</td>

								<!-- Heater active -->
								<td class="pl-2 pr-1">
									<tool-input :bed="bed" :bedIndex="index" :heaterIndex="heaterIndex + 1" active></tool-input>
								</td>

								<!-- Heater standby -->
								<td class="pl-1 pr-2">
									<tool-input v-if="bed.standby.length > heaterIndex + 1" :bed="bed" :bedIndex="index" :heaterIndex="heaterIndex + 1" standby></tool-input>
								</td>
							</tr>
						</template>

						<!-- Chambers -->
						<template v-for="(chamber, index) in heat.chambers.filter(chamber => chamber !== null)">
							<!-- Divider -->
							<tr :key="`div-chamber-${index}`">
								<td colspan="5">
									<v-divider></v-divider>
								</td>
							</tr>

							<!-- First chamber row -->
							<tr :key="`chamber-${index}-0`">
								<!-- Chamber name -->
								<th :rowspan="Math.max(1, chamber.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !chamber.heaters.length}">
									<a href="javascript:void(0)" @click="chamberClick(chamber, index)">
										{{ chamber.name || $t('panel.tools.chamber', [(heat.chambers.length !== 1) ? index : '']) }}
									</a>
								</th>

								<!-- First chamber heater name -->
								<th>
									<template v-if="isValidHeaterItem(chamber, 0)">
										<a href="javascript:void(0)" @click="chamberHeaterClick(chamber, index, chamber.heaters[0])" :class="getHeaterColor(chamber.heaters[0])">
											{{ formatHeaterName(chamber, 0) }}
										</a>
										<template v-if="heat.heaters[chamber.heaters[0]].state !== null">
											<br>
											<span class="font-weight-regular caption">
												{{ $t(`generic.heaterStates[${heat.heaters[chamber.heaters[0]].state}]`) }}
											</span>
										</template>
									</template>
									<span v-else>
										{{ $t('generic.noValue') }}
									</span>
								</th>

								<!-- First chamber heater value -->
								<td class="text-center">
									<span v-if="isValidHeaterItem(chamber, 0)">
										{{ formatHeaterValue(heat.heaters[chamber.heaters[0]]) }}
									</span>
									<span v-else>
										{{ $('generic.noValue') }}
									</span>
								</td>

								<!-- First chamber heater active -->
								<td class="pl-2 pr-1">
									<tool-input v-if="chamber.heaters.length" :chamber="chamber" :chamberIndex="0" :heaterIndex="0" active></tool-input>
								</td>

								<!-- First chamber heater standby -->
								<td class="pl-1 pr-2">
									<tool-input v-if="chamber.heaters.length" :chamber="chamber" :chamberIndex="0" :heaterIndex="0" standby></tool-input>
								</td>
							</tr>

							<!-- Following chamber rows for chambers with more than one heater -->
							<tr v-for="(heater, heaterIndex) in chamber.heaters.slice(1)" :key="`chamber-${index}-${heaterIndex + 1}`">
								<!-- Heater name -->
								<th>
									<a href="javascript:void(0)" @click="chamberHeaterClick(chamber, index, heater)" :class="getHeaterColor(heater)">
										{{ formatHeaterName(chamber, heaterIndex) }}
									</a>
									<template v-if="heat.heaters[heater].state !== null">
										<br>
										<span class="font-weight-regular caption">
											{{ $t(`generic.heaterStates[${heat.heaters[heater].state}]`) }}
										</span>
									</template>
								</th>

								<!-- Heater value -->
								<td>
									<span v-if="isValidHeaterItem(chamber, heaterIndex)">
										{{ formatHeaterValue(heat.heaters[heater]) }}
									</span>
									<span v-else>
										{{ $t('generic.noValue') }}
									</span>
								</td>

								<!-- Heater active -->
								<td class="pl-2 pr-1">
									<tool-input :chamber="chamber" :chamberIndex="index" :heaterIndex="heaterIndex + 1" active></tool-input>
								</td>

								<!-- Heater standby -->
								<td class="pl-1 pr-2">
									<tool-input v-if="chamber.standby.length > heaterIndex + 1" :chamber="chamber" :chamberIndex="index" :heaterIndex="heaterIndex + 1" standby></tool-input>
								</td>
							</tr>
						</template>
					</tbody>
				</table>

				<v-alert :value="!tools.length" type="info" class="mb-0">
					{{ $t('panel.tools.noTools') }}
				</v-alert>

				<reset-heater-fault-dialog :shown.sync="resetHeaterFault" :heater="faultyHeater"></reset-heater-fault-dialog>
				<filament-dialog :shown.sync="filamentMenu.dialogShown" :tool="filamentMenu.tool"></filament-dialog>
			</template>

			<template v-else-if="currentPage === 'extra'">
				<table class="extra ml-2 mr-2" v-show="heat.extra.length">
					<thead>
						<th class="hidden-sm-and-down"></th>
						<th>{{ $t('panel.tools.extra.sensor') }}</th>
						<th>{{ $t('panel.tools.extra.value') }}</th>
					</thead>
					<tbody>
						<tr v-for="(extraHeater, index) in heat.extra" :key="`extra-${index}-${extraHeater}`">
							<td class="hidden-sm-and-down">
								<v-switch class="ml-3" :input-value="displayedExtraTemperatures.indexOf(index) !== -1" @change="toggleExtraHeaterVisibility(index)" :label="$t('panel.tools.extra.showInChart')" :disabled="uiFrozen"></v-switch>
							</td>
							<th class="py-2" :class="getExtraHeaterColor(index)">
								{{ formatExtraHeaterName(extraHeater, index) }}
							</th>
							<td class="py-2">
								{{ formatHeaterValue(extraHeater) }}
							</td>
						</tr>
					</tbody>
				</table>
				<v-alert :value="!heat.extra.length" type="info">
					{{ $t('panel.tools.extra.noItems') }}
				</v-alert>
			</template>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

import { getHeaterColor, getExtraHeaterColor } from '../../utils/colors.js'
import { DisconnectedError } from '../../utils/errors.js'

export default {
	computed: {
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapState('machine/model', ['heat', 'state', 'spindles', 'tools']),
		...mapState('machine/settings', ['displayedExtraTemperatures']),
		...mapState('settings', ['darkTheme']),
		canTurnEverythingOff() {
			return !this.uiFrozen && this.heat.heaters.some(heater => heater.state);
		},
		selectedToolClass() {
			return this.darkTheme ? 'grey darken-3' : 'blue lighten-5';
		}
	},
	data() {
		return {
			dropdownShown: false,
			turningEverythingOff: false,

			currentPage: 'tools',
			waitingForCode: false,

			loadingFilament: false,
			filamentMenu: {
				tool: undefined,
				dialogShown: false
			},

			resetHeaterFault: false,
			faultyHeater: -1
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		...mapMutations('machine/settings', ['toggleExtraHeaterVisibility']),

		showDropdown() {
			this.dropdownShown = !this.dropdownShown;
			if (this.dropdownShown) {
				const input = this.$refs.allActive;
				setTimeout(() => input.focus(), 300);
			}
		},
		async turnEverythingOff() {
			let code = '';
			this.tools.forEach(function(tool) {
				if (tool.heaters.length) {
					const temps = tool.heaters.map(() => '-273.15').join(':');
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

		isValidHeaterItem(item, index) {
			return (index < item.heaters.length) && (item.heaters[index] < this.heat.heaters.length) && this.heat.heaters[item.heaters[index]];
		},
		isValidToolSpindle(tool) {
			return this.isNumber(tool.spindle) && tool.spindle >= 0 && tool.spindle < this.spindles.length && this.spindles[tool.spindle];
		},

		getHeaterColor: heater => getHeaterColor(heater),
		getExtraHeaterColor: heater => getExtraHeaterColor(heater),
		formatHeaterName(item, index) {
			if (index < item.heaters.length) {
				const heaterIndex = item.heaters[index];
				if (heaterIndex < this.heat.heaters.length && this.heat.heaters[heaterIndex] && this.heat.heaters[heaterIndex].name) {
					const heaterName = this.heat.heaters[item.heaters[index]].name;
					const matches = /(.*)\[(.*)\]$/.exec(heaterName);
					if (matches) {
						return matches[1];
					}
					return heaterName;
				}
				return this.$t('panel.tools.heater', [heaterIndex]);
			}
			return this.$t('generic.noValue');
		},
		formatExtraHeaterName(extraHeater, index) {
			if (extraHeater && extraHeater.name) {
				const matches = /(.*)\[(.*)\]$/.exec(extraHeater.name);
				if (matches) {
					return matches[1];
				}
				return extraHeater.name;
			}
			return this.$t('panel.tools.heater', [index + 100]);
		},
		formatHeaterValue(heater) {
			let unit = (heater.sensor >= 450 && heater.sensor < 500) ? '%RH' : 'C';
			if (heater.name) {
				const matches = /(.*)\[(.*)\]$/.exec(heater.name);
				if (matches) {
					return this.$display(heater.current, 1, matches[2]);
				}
			}
			return this.$display(heater.current, 1, unit);
		},

		canLoadFilament(tool) {
			return !this.uiFrozen && (tool.filament !== undefined) && this.isNumber(tool.filamentExtruder);
		},
		unloadFilament() {
			if (!this.isConnected) {
				return;
			}

			let code = '';
			if (this.state.currentTool !== this.filamentMenu.tool.number) {
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

			let offTemps;
			switch (this.heat.heaters[heater].state) {
				case 0:		// Off -> Active
					this.sendCode(`T${tool.number}`);
					break;

				case 1:		// Standby -> Off
					offTemps = tool.active.map(() => '-273.15').join(':');
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

		bedClick(bed, bedIndex) {
			if (bed.heaters.length) {
				// There is no special action for clicking Bed yet
				this.bedHeaterClick(bed, bedIndex, bed.heaters[0]);
			}
		},
		bedHeaterClick(bed, bedIndex, heater) {
			if (!this.isConnected) {
				return;
			}

			let temps;
			switch (this.heat.heaters[heater].state) {
				case 0:		// Off -> Active
					temps = (bed.active instanceof Array) ? bed.active.join(':') : bed.active;
					this.sendCode(`M140 P${bedIndex} S${temps}`);
					break;

				case 1:		// Standby -> Off
					temps = (bed.active instanceof Array) ? bed.active.map(() => '-273.15').join(':') : '-273.15';
					this.sendCode(`M140 P${bedIndex} S${temps}`);
					break;

				case 2:		// Active -> Standby
					this.sendCode(`M144 P${bedIndex}`);
					break;

				case 3:		// Fault -> Ask for reset
					this.faultyHeater = heater;
					this.resetHeaterFault = true;
					break;
			}
		},

		chamberClick(chamber, chamberIndex) {
			if (chamber.heaters.length) {
				// There is no special action for clicking Chamber yet
				this.chamberHeaterClick(chamber, chamberIndex, chamber.heaters[0]);
			}
		},
		chamberHeaterClick(chamber, chamberIndex, heater) {
			if (!this.isConnected) {
				return;
			}

			let temps;
			switch (this.heat.heaters[heater].state) {
				case 0:		// Off -> Active
					temps = (chamber.active instanceof Array) ? chamber.active.join(':') : chamber.active;
					this.sendCode(`M141 P${chamberIndex} S${temps}`);
					break;

				// Standby mode for chambers is not officially supported yet (there's no code for standby control)

				case 3:		// Fault -> Ask for reset
					this.faultyHeater = heater;
					this.resetHeaterFault = true;
					break;

				default:	// Active -> Off
					temps = (chamber.active instanceof Array) ? chamber.active.map(() => '-273.15').join(':') : '-273.15';
					this.sendCode(`M141 P${chamberIndex} S${temps}`);
					break;
			}
		}
	}
}
</script>
