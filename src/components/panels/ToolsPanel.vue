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
	<base-panel v-auto-size>
		<template slot="title">
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
					<v-layout justify-center column class="pt-2 pl-2 pr-2">
						<v-btn color="primary" class="all-off mb-3" :disabled="frozen" @click="disableAll">
							<v-icon>power_off</v-icon> Turn Everything Off
						</v-btn>

						<label>Set all active temperatures to:</label>
						<heater-input all active></heater-input>
						<label>Set all standby temperatures to:</label>
						<heater-input all standby></heater-input>
					</v-layout>
				</v-card>
			</v-menu>
		</template>

		<template v-if="currentPage == 'tools'">
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
						<tr :class="{ 'grey lighten-4' : tool.number === operation.currentTool }" :key="`tool-${index}-${tool.heaters.length && tool.heaters[0]}`">
							<th :rowspan="Math.max(1, tool.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !tool.heaters.length}">
								<a href="#" @click.prevent="toolClick(tool)">
									{{ tool.name || $t('panel.tools.tool', [tool.number]) }}
								</a>
								<br/>
								<span class="font-weight-regular caption">
									T{{ tool.number }}
									<template v-if="canLoadFilament(tool)">
										- <panel-link :active="!loadingFilament" class="font-weight-regular" href="#" @click="filamentClick(tool)">
											{{ tool.filament ? tool.filament : $t('panel.tools.loadFilament') }}
											</panel-link>
									</template>
								</span>
							</th>

							<th>
								<a v-if="tool.heaters.length" href="#" :class="getHeaterColor(tool.heaters[0])" @click.prevent="toolHeaterClick(tool, 0)">
									{{ heaters.heaters[tool.heaters[0]].name ? heaters.heaters[tool.heaters[0]].name : $t('panel.tools.heater', [tool.heaters[0]]) }}
								</a>
								<br/>
								<span v-if="tool.heaters.length && heaters.heaters[tool.heaters[0]].state !== undefined" class="font-weight-regular caption">
									{{ $t(`generic.heaterStates[${heaters.heaters[tool.heaters[0]].state}]`) }}
								</span>
							</th>
							<td class="text-center">
								<span v-if="tool.heaters.length">
									{{ $display(heaters.heaters[tool.heaters[0]].current, 1, getSensorUnit(heaters.heaters[tool.heaters[0]].sensor)) }}
								</span>
							</td>
							<td class="pl-2 pr-1">
								<heater-input v-if="tool.heaters.length" :tool="tool" :heaterIndex="0" active></heater-input>
							</td>
							<td class="pl-1 pr-2">
								<heater-input v-if="tool.heaters.length" :tool="tool" :heaterIndex="0" standby></heater-input>
							</td>
						</tr>

						<tr v-for="(heater, heaterIndex) in tool.heaters.slice(1)" :class="{ 'grey lighten-4' : tool.number === operation.currentTool }" :key="`tool-${index}-${heater}`">
							<th>
								<a href="#" :class="getHeaterColor(heater)" @click.prevent="toolHeaterClick(tool, heater)">
									{{ heaters.heaters[heater].name ? heaters.heaters[heater].name : $t('panel.tools.heater', [heater]) }}
								</a>
								<br/>
								<span v-if="heaters.heaters[heater].state !== undefined" class="font-weight-regular caption">
									{{ $t(`generic.heaterStates[${heaters.heaters[heater].state}]`) }}
								</span>
							</th>
							<td>
								{{ $display(heaters.heaters[heater].current, 1, getSensorUnit(heaters.heaters[heater].sensor)) }}
							</td>
							<td class="pl-2 pr-1">
								<heater-input :tool="tool" :heaterIndex="heaterIndex + 1" active></heater-input>
							</td>
							<td class="pl-1 pr-2">
								<heater-input :tool="tool" :heaterIndex="heaterIndex + 1" standby></heater-input>
							</td>
						</tr>

						<tr v-if="index !== tools.length - 1" :key="`div-tool-${index}`">
							<td colspan="5">
								<v-divider></v-divider>
							</td>
						</tr>
					</template>

					<!-- Beds -->
					<template v-for="(bed, index) in heaters.beds">
						<tr :key="`div-bed-${index}`">
							<td colspan="5">
								<v-divider></v-divider>
							</td>
						</tr>

						<tr :key="`bed-${index}-${bed.heaters.length && bed.heaters[0]}`">
							<th :rowspan="Math.max(1, bed.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !bed.heaters.length}">
								<a href="#" @click.prevent="bedClick(bed)">
									{{ bed.name || $t('panel.tools.bed', [(heaters.beds.length !== 1) ? index : '']) }}
								</a>
								<br/>
								<span v-if="bed.heaters.length > 0 && heaters.heaters[bed.heaters[0]].state !== undefined" class="font-weight-regular caption">
									{{ $t(`generic.heaterStates[${heaters.heaters[bed.heaters[0]].state}]`) }}
								</span>
							</th>

							<th>
								<a v-if="bed.heaters.length" href="#" :class="getHeaterColor(bed.heaters[0])" @click.prevent="bedHeaterClick(bed, 0)">
									{{ heaters.heaters[bed.heaters[0]].name ? heaters.heaters[bed.heaters[0]].name : $t('panel.tools.heater', [bed.heaters[0]]) }}
								</a>
							</th>
							<td class="text-center">
								<span v-if="bed.heaters.length">
									{{ $display(heaters.heaters[bed.heaters[0]].current, 1, getSensorUnit(heaters.heaters[bed.heaters[0]].sensor)) }}
								</span>
							</td>
							<td class="pl-2 pr-1">
								<heater-input v-if="bed.heaters.length" :bed="bed" :heaterIndex="0" active></heater-input>
							</td>
							<td class="pl-1 pr-2">
								<!-- Bed standby temperatures are not supported (yet) -->
							</td>
						</tr>
						<tr v-for="(heater, heaterIndex) in bed.heaters.slice(1)" :key="`bed-${index}-${heater}`">
							<th>
								<a href="#" :class="getHeaterColor(heater)" @click.prevent="toolHeaterClick(tool, heater)">
									{{ heaters.heaters[heater].name ? heaters.heaters[heater].name : $t('panel.tools.heater', [heater]) }}
								</a>
								<br/>
								<span v-if="heaters.heaters[heater].state !== undefined" class="font-weight-regular caption">
									{{ $t(`generic.heaterStates[${heaters.heaters[heater].state}]`) }}
								</span>
							</th>
							<td>
								{{ $display(heaters.heaters[heater].current, 1, getSensorUnit(heaters.heaters[heater].sensor)) }}
							</td>
							<td class="pl-2 pr-1">
								<heater-input :bed="bed" :heaterIndex="heaterIndex + 1" active></heater-input>
							</td>
							<td class="pl-1 pr-2">
								<!-- Bed standby temperatures are not supported (yet) -->
							</td>
						</tr>
					</template>

					<!-- Chambers -->
					<template v-for="(chamber, index) in heaters.chambers">
						<tr :key="`div-${index}`">
							<td colspan="5">
								<v-divider></v-divider>
							</td>
						</tr>

						<tr :key="`chamber-${index}-${chamber.heaters.length && chamber.heaters[0]}`">
							<th :rowspan="Math.max(1, chamber.heaters.length)" class="pl-2" :class="{ 'pt-2 pb-2' : !chamber.heaters.length}">
								<a href="#" @click.prevent="chamberClick(chamber)">
									{{ chamber.name || $t('panel.tools.chamber', [(heaters.chambers.length !== 1) ? index : '']) }}
								</a>
								<br/>
								<span v-if="chamber.heaters.length > 0 && heaters.heaters[chamber.heaters[0]].state !== undefined" class="font-weight-regular caption">
									{{ $t(`generic.heaterStates[${heaters.heaters[chamber.heaters[0]].state}]`) }}
								</span>
							</th>

							<th>
								<a v-if="chamber.heaters.length > 0" href="#" :class="getHeaterColor(chamber.heaters[0])" @click.prevent="chamberHeaterClick(chamber, 0)">
									{{ heaters.heaters[chamber.heaters[0]].name ? heaters.heaters[chamber.heaters[0]].name : $t('panel.tools.heater', [chamber.heaters[0]]) }}
								</a>
							</th>
							<td class="text-center">
								<span v-if="chamber.heaters.length > 0">
									{{ $display(heaters.heaters[chamber.heaters[0]].current, 1, getSensorUnit(heaters.heaters[chamber.heaters[0]].sensor)) }}
								</span>
							</td>
							<td class="pl-2 pr-1">
								<heater-input v-if="chamber.heaters.length > 0" :chamber="chamber" :heaterIndex="0" active></heater-input>
							</td>
							<td class="pl-1 pr-2">
								<!-- Chamber standby temperatures are not supported (yet) -->
							</td>
						</tr>
						<tr v-for="(heater, heaterIndex) in chamber.heaters.slice(1)" :key="`chamber-${index}-${heater}`">
							<th>
								<a href="#" :class="getHeaterColor(heater)" @click.prevent="toolHeaterClick(tool, heater)">
									{{ heaters.heaters[heater].name ? heaters.heaters[heater].name : $t('panel.tools.heater', [heater]) }}
								</a>
								<br/>
								<span v-if="heaters.heaters[heater].state !== undefined" class="font-weight-regular caption">
									{{ $t(`generic.heaterStates[${heaters.heaters[heater].state}]`) }}
								</span>
							</th>
							<td>
								{{ $display(heaters.heaters[heater].current, 1, getSensorUnit(heaters.heaters[heater].sensor)) }}
							</td>
							<td class="pl-2 pr-1">
								<heater-input :chamber="chamber" :heaterIndex="heaterIndex + 1" active></heater-input>
							</td>
							<td class="pl-1 pr-2">
								<!-- Chamber standby temperatures are not supported (yet) -->
							</td>
						</tr>
					</template>
				</tbody>
			</table>

		</template>

		<template v-if="currentPage == 'extra'">
			<table class="extra ml-2 mr-2">
				<thead>
					<th></th>
					<th>{{ $t('panel.tools.extra.sensor') }}</th>
					<th>{{ $t('panel.tools.extra.value') }}</th>
				</thead>
				<tbody>
					<tr v-for="(extraHeater, index) in heaters.extra" :key="`extra-${index}`">
						<td>
							<v-switch class="ml-3" @change="setExtraVisibility(index, $event)" :label="$t('panel.tools.extra.showInChart')"></v-switch>
						</td>
						<th>
							{{ extraHeater.name }}
						</th>
						<td>
							{{ $display(extraHeater.current, 1, getSensorUnit(extraHeater.sensor)) }}
						</td>
					</tr>
				</tbody>
			</table>
		</template>
	</base-panel>
</template>

<script>
'use strict'

import { mapActions, mapGetters, mapState } from 'vuex'

import { getHeaterColor } from '../../utils/colors.js'
import { GCodeDisconnectedError } from '../../utils/errors.js'

export default {
	components: {
		'heater-input': {
			template: '<v-combobox type="number" min="-273" max="1999" v-model.number="value" :loading="applying" :disabled="frozen" @keyup="keyUp"></v-combobox>',
			computed: {
				...mapGetters('ui', ['frozen']),
				...mapState('machine', ['heaters'])
			},
			data() {
				return {
					applying: false,
					input: null,
					value: 0
				}
			},
			props: {
				active: Boolean,
				standby: Boolean,
				all: Boolean,
				tool: Object,
				bed: Object,
				chamber: Object,
				heaterIndex: Number
			},
			methods: {
				...mapActions('machine', ['sendCode']),
				async apply() {
					if (!this.applying) {
						if (this.isNumber(this.value) && this.value >= -273 && this.value <= 1999) {
							this.applying = true;
							try {
								if (this.tool !== undefined) {
									// Set tool temp
									const currentTemps = this.tool[this.active ? 'active' : 'standby'];
									const newTemps = currentTemps.map((temp, i) => (i === this.heaterIndex) ? this.value : temp).reduce((a, b) => `${a}:${b}`);
									await this.sendCode(`G10 P${this.tool.number} ${this.active ? 'S' : 'R'}${newTemps}`);
								} else if (this.bed !== undefined) {
									// TODO: Set bed temp
								} else if (this.chamber !== undefined) {
									// TODO: Set chamber temp
								} else if (this.all) {
									// TODO: Set all
								} else {
									console.warn('[heater-input] Invalid target for heater-input');
								}
							} catch (e) {
								if (!(e instanceof GCodeDisconnectedError)) {
									this.$log('error', e.message);
								}
							}
							this.applying = false;
						} else {
							this.$toast.makeNotification('warning', this.$t('error.enterValidNumber'));
						}
					}
				},
				keyUp(e) {
					if (e.keyCode === 13 || (e.keyCode === 9 && this.$vuetify.breakpoint.smAndDown)) {
						this.apply();
					}
				}
			},
			mounted() {
				this.input = this.$el.querySelector('input');
			},
			watch: {
				'tool.active'(to) {
					if (document.activeElement !== this.input && this.active) {
						this.value = to;
					}
				},
				'tool.standby'(to) {
					if (document.activeElement !== this.input && this.standby) {
						this.value = to;
					}
				},
				'bed.active'(to) {
					if (document.activeElement !== this.input && this.active) {
						this.value = (to instanceof Array) ? to[this.heaterIndex] : to;
					}
				},
				'chamber.active'(to) {
					if (document.activeElement !== this.input && this.active) {
						this.value = (to instanceof Array) ? to[this.heaterIndex] : to;
					}
				}
			}
		}
	},
	computed: {
		...mapGetters(['isConnected']),
		...mapGetters('ui', ['frozen']),
		...mapState('machine', ['operation', 'tools', 'heaters'])
	},
	data() {
		return {
			currentPage: 'tools',
			loadingFilament: false,
			waitingForCode: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		disableAll() {
			// TODO
		},

		getHeaterColor: (heater) => getHeaterColor(heater),
		getSensorUnit: (sensor) => (sensor >= 450 && sensor < 500) ? '%RH' : '&#8451;',

		canLoadFilament(tool) {
			// TODO enhance this, e.g. using dedicate setting saying if E count does not matter
			return this.isConnected && (tool.extruders.length === 1);
		},
		filamentClick(tool) {
			// TODO
		},

		toolClick(tool) {
			if (!this.isConnected) {
				return;
			}

			this.waitingForCode = true;
			try {
				if (this.operation.currentTool === tool.number) {
					// Deselect current tool
					this.sendCode('T-1');
				} else {
					// Select new tool
					this.sendCode(`T${tool.number}`);
				}
			} catch (e) {
				if (!(e instanceof GCodeDisconnectedError)) {
					this.$log('error', e.message);
				}
			}
			this.waitingForCode = false;
		},
		toolHeaterClick(tool, heater) { this.toolClick(tool); },

		bedClick(bed) {

		},
		bedHeaterClick(bed, heater) { this.bedClick(bed); },

		chamberClick(chamber) {

		},
		chamberHeaterClick(chamber, heater) { this.chamberClick(chamber); },

		setExtraVisibility(index, visibility) {
			// TODO bind this to the ui store
		}
	}
}
</script>
