<style>
.centered-alert > div {
	align-items: center;
}
.centered-alert > div > div {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
</style>

<template>
	<v-dialog v-model="shownInternal" max-width="640px" no-click-animation>
		<v-card>
			<v-card-title>
				<span class="headline">
					Record Motion Profile
				</span>
			</v-card-title>

			<v-card-text class="pb-0">
				<v-window v-model="currentPage">
					<!-- Start -->
					<v-window-item value="start">
						This wizard lets you to collect motion profiles using an accelerometer to tune input shaping.<br>

						<ul class="mt-3 mb-4">
							<li>Motion Profile #{{ this.run }}</li>
							<li>Input Shaper: {{ this.shaper }}</li>
							<li v-show="frequency !== null">Shaper Frequency: {{ frequency }}</li>
							<li v-show="damping !== null">Damping Factor: {{ damping }}</li>
							<li v-show="amplitudes !== null">Amplitudes: {{ amplitudes }}</li>
							<li v-show="durations !== null">Durations: {{ durations }}</li>
						</ul>

						<v-alert :value="accelerometers.length === 0" dense text type="error" class="my-3">
							No accelerometer found!
							<a href="https://docs.duet3d.com/User_manual/Connecting_hardware/Sensors_Accelerometer" target="_blank" class="float-right">
								Help
							</a>
						</v-alert>
						<v-alert :value="!allAxesHomed" border="left" dense text type="warning" class="centered-alert my-3">
							Machine is not homed
							<code-btn code="G28" color="warning" small class="float-right">
								Home All
							</code-btn>
						</v-alert>
						<v-alert :value="(accelerometers.length > 0) && allAxesHomed" dense text type="success" class="my-3">
							Ready to record data
						</v-alert>

						<span v-show="(accelerometers.length > 0) && allAxesHomed">
							Press Next to continue.
						</span>
					</v-window-item>

					<!-- Configuration -->
					<v-window-item value="config">
						<div class="d-flex flex-column">
							Here you can define different moves for the data collection.

							<v-simple-table class="mt-1">
								<thead>
								<tr>
									<th class="px-0">
										Tool
									</th>
									<th>
										Accelerometer
									</th>
									<th class="px-0">
										Axis
									</th>
									<th class="pr-0">
										Start Position
									</th>
									<th>
										End Position
									</th>
									<th></th>
								</tr>
								</thead>
								<tbody>
								<tr v-for="(move, index) in moves" :key="index">
									<td class="px-0">
										<v-select :value="move.tool" @change="setMoveTool(move, $event)" :items="toolList" class="pt-0" hide-details/>
									</td>
									<td>
										<v-select v-model="move.accelerometer" :items="accelerometers" :rules="[val => !!val]" class="pt-0" hide-details/>
									</td>
									<td class="px-0">
										<v-select :value="move.axis" @change="setMoveAxis(move, $event)" :items="['X', 'Y', 'X+Y']" class="pt-0" hide-details/>
									</td>
									<td class="pr-0">
										<v-text-field v-model.number="move.start" type="number" :min="getMin(move, true)" :max="getMax(move, true)" :rules="getRules(move, true)" class="pt-0" hide-details/>
									</td>
									<td>
										<v-text-field v-model.number="move.end" type="number" :min="getMin(move, false)" :max="getMax(move, false)" :rules="getRules(move, false)" class="pt-0" hide-details/>
									</td>
									<td class="px-0">
										<v-btn color="warning" outlined :disabled="moves.length <= 1" @click="removeMove(index)">
											<v-icon>mdi-delete</v-icon>
										</v-btn>
									</td>
								</tr>
								</tbody>
							</v-simple-table>
							<v-divider class="mb-3"/>

							<v-btn color="blue darken-1" class="mx-auto" outlined text @click="addMove">
								<v-icon class="mr-1">mdi-plus</v-icon>
								Add Move
							</v-btn>

							<v-alert :value="hasExternalAccelerometers" type="info" dense class="mt-3">
								This machine appears to have expansion boards with embedded accelerometers. If you are operating a tool changer, it is recommended to set the corresponding tool for each accelerometer.
							</v-alert>

							<v-checkbox class="my-2" v-model="centerAxes" label="Centre unused axes before each move" :ripple="false" hide-details/>
							<div v-show="centerAxes" class="mx-9">
								<div class="d-inline-flex">
									<v-text-field type="number" v-model.number="xAxisCenter" label="X axis centre position" :min="xAxis.min" :max="xAxis.max" step="1" :rules="[(val) => !isNaN(val) && val >= xAxis.min && val <= xAxis.max]"/>
									<v-text-field type="number" class="ml-5" v-model.number="yAxisCenter" label="Y axis centre position" :min="xAxis.min" :max="xAxis.max" step="1" :rules="[(val) => !isNaN(val) && val >= yAxis.min && val <= yAxis.max]"/>
									<v-text-field v-show="showZCenter" type="number" class="ml-5" v-model.number="zAxisCenter" label="Z axis centre position" :rules="[(val) => !isNaN(val) && val >= zAxis.min && val <= zAxis.max]"/>
								</div>
							</div>
							<v-checkbox class="my-2" v-model="recordWholeMove" label="Capture data during the whole length of the move" :ripple="false" hide-details/>

							The machine will record a new Motion Profile as soon as Next is clicked.
						</div>
					</v-window-item>

					<!-- Data Collection -->
					<v-window-item value="collection">
						<span v-show="!finished">
							Please stand by while Motion Profiles are being recorded...
						</span>

						<v-simple-table class="mt-1">
							<thead>
							<tr>
								<th class="px-0"></th>
								<th>
									Tool
								</th>
								<th class="px-0">
									Accelerometer
								</th>
								<th>
									Axis
								</th>
								<th class="px-0">
									Start Position
								</th>
								<th>
									End Position
								</th>
							</tr>
							</thead>
							<tbody>
							<tr v-for="(move, index) in moves" :key="index">
								<td class="px-0">
									<v-icon>
										{{ getMoveIcon(move) }}
									</v-icon>
								</td>
								<td>
									{{ move.tool ? (move.tool.name || `T${move.tool.number}`) : 'None' }}
								</td>
								<td class="px-0">
									{{ move.accelerometer }}
								</td>
								<td>
									{{ move.axis }}
								</td>
								<td class="px-0">
									{{ move.start }}
								</td>
								<td>
									{{ move.end }}
								</td>
							</tr>
							</tbody>
						</v-simple-table>
						<v-divider/>

						<v-alert :value="cancelled" dense text type="error" class="mt-3">
							Data collection cancelled!
						</v-alert>
						<v-alert :value="finished" dense text type="success" class="mt-3">
							Recording of Motion Profile #{{ this.run }} is complete!
						</v-alert>
					</v-window-item>
				</v-window>
			</v-card-text>

			<v-card-actions>
				<v-btn v-show="!cancelled && !finished" color="blue darken-1" text @click="cancel">
					Cancel
				</v-btn>
				<v-spacer/>
				<v-btn v-show="canGoBack" color="blue darken-1" text @click="goBack">
					Back
				</v-btn>
				<v-btn v-show="currentPage !== 'collection'" color="blue darken-1" text :disabled="!canGoNext" @click="goNext">
					Next
				</v-btn>
				<v-btn v-show="cancelled || finished" color="blue darken-1" text @click="shownInternal = false">
					Finish
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { Axis, KinematicsName, MachineStatus } from '@duet3d/objectmodel';
import { mapActions, mapState } from 'vuex';

import { OperationCancelledError } from '@/utils/errors';

const MoveState = {
	idle: 'idle',
	recording: 'recording',
	finished: 'finished',
	cancelled: 'cancelled'
}

export default {
	props: {
		lastRun: {
			required: true,
			type: Number
		},
		shown: {
			required: true,
			type: Boolean
		}
	},
	computed: {
		...mapState('machine/model', ['boards', 'move', 'tools', 'state']),
		xAxis() { return this.move.axes.find(axis => axis.letter === 'X') || new Axis(); },
		yAxis() { return this.move.axes.find(axis => axis.letter === 'Y') || new Axis(); },
		zAxis() { return this.move.axes.find(axis => axis.letter === 'Z') || new Axis(); },
		shownInternal: {
			get() { return this.shown },
			set(value) { this.$emit('update:shown', value); }
		},
		shaper() {
			if (this.move.shaping.type === 'none') {
				return 'None';
			}
			if (this.move.shaping.type === 'custom') {
				return 'Custom';
			}
			return this.move.shaping.type.toUpperCase();
		},
		frequency() {
			return (this.move.shaping.type === 'none' || this.move.shaping.type === 'custom') ? null : `${this.move.shaping.frequency}Hz`;
		},
		damping() {
			return (this.move.shaping.type === 'none' || this.move.shaping.type === 'custom') ? null : this.move.shaping.damping.toString();
		},
		amplitudes() {
			return (this.move.shaping.type === 'custom') ? this.move.shaping.amplitudes.map(amplitude => amplitude.toString()).reduce((a, b) => a + ', ' + b) : null;
		},
		durations() {
			return (this.move.shaping.type === 'custom') ? this.move.shaping.durations.map(duration => (duration / 1000).toFixed(3) + 'ms').reduce((a, b) => a + ', ' + b) : null;
		},
		allAxesHomed() { return !this.move.axes.some(axis => !axis.homed); },
		accelerometers() {
			return this.boards
				.filter(board => board.accelerometer !== null)
				.map(board => board.canAddress ? `${board.canAddress}.0` : '0');
		},
		hasExternalAccelerometers() {
			return this.boards.some(board => (board.canAddress !== 0) && !!board.accelerometer);
		},
		toolList() {
			return [{ text: 'None', value: null }]
				.concat(
					this.tools
						.filter(tool => !!tool)
						.map(tool => ({
							text: tool.name || tool.number.toString(),
							value: tool
						})
				));
		},
		showZCenter() {
			return [KinematicsName.delta, KinematicsName.rotaryDelta, KinematicsName.coreXZ].includes(this.move.kinematics.name);
		},
		maxSpeed() {
			let maxSpeed = 6000;
			for (let axis of this.move.axes) {
				if (axis.speed > maxSpeed) {
					maxSpeed = axis.speed;
				}
			}
			return this.moves.some(move => move.axis.length > 1) ? Math.round(maxSpeed * Math.sqrt(2)) : maxSpeed;
		},
		canGoBack() {
			return this.currentPage === 'config';
		},
		canGoNext() {
			switch (this.currentPage) {
				case 'start': return (this.accelerometers.length > 0) && this.allAxesHomed;
				case 'config':
					for (let move of this.moves) {
						if (!move.accelerometer || !move.axis || move.start >= move.end ||
							move.start < this.getMin(move, true) || move.start > this.getMax(move, true) ||
							move.end < this.getMin(move, false) || move.end > this.getMax(move, false)) {
							return false;
						}
					}
					return (this.moves.length > 0) && (!this.centerAxes || (
						!isNaN(this.xAxisCenter) && this.xAxisCenter >= this.xAxis.min && this.xAxisCenter < this.xAxis.max &&
						!isNaN(this.yAxisCenter) && this.yAxisCenter >= this.yAxis.min && this.yAxisCenter < this.yAxis.max &&
						((!isNaN(this.zAxisCenter) && this.zAxisCenter >= this.zAxis.min && this.zAxisCenter < this.zAxis.max) || !this.showZCenter)));
			}
			return false;
		}
	},
	data() {
		return {
			currentPage: 'start',
			moves: [],
			centerAxes: true,
			xAxisCenter: 0,
			yAxisCenter: 0,
			zAxisCenter: 0,
			recordWholeMove: true,
			run: 0,
			finished: false,
			cancelled: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		refreshCenters() {
			if (this.currentPage === 'collection') {
				return;
			}

			this.xAxisCenter = (this.xAxis.min + this.xAxis.max) / 2;
			this.yAxisCenter = (this.yAxis.min + this.yAxis.max) / 2;
			this.zAxisCenter = (this.zAxis.min + this.zAxis.max) / 2;
		},
		makeMoves() {
			if (this.currentPage === 'collection') {
				return;
			}

			this.moves = this.move.axes
				.filter(axis => axis.letter === 'X' || axis.letter === 'Y')
				.map(axis => ({
					state: MoveState.idle,
					tool: null,
					accelerometer: (this.accelerometers.length > 0) ? this.accelerometers[0] : null,
					axis: axis.letter,
					start: Math.round((axis.min + axis.max) / 2 - (axis.max - axis.min) / 4),
					end: Math.round((axis.min + axis.max) / 2 + (axis.max - axis.min) / 4),
				}));
		},
		addMove() {
			const xAxis = this.move.axes.find(axis => axis.letter === 'X');
			this.moves.push({
				state: MoveState.idle,
				tool: null,
				accelerometer: (this.accelerometers.length > 0) ? this.accelerometers[0] : null,
				axis: 'X',
				start: xAxis ? Math.round((xAxis.min + xAxis.max) / 2 - (xAxis.max - xAxis.min) / 4) : null,
				end: xAxis ? Math.round((xAxis.min + xAxis.max) / 2 + (xAxis.max - xAxis.min) / 4) : null
			});
		},
		setMoveTool(move, tool) {
			const axisIndex = this.move.axes.findIndex(axis => axis.letter === move.axis);
			if (axisIndex >= 0) {
				if (move.tool) {
					// Subtract old tool offset
					move.start -= move.tool.offsets[axisIndex];
					move.end -= move.tool.offsets[axisIndex];
				}

				if (tool) {
					// Add new tool offset
					move.start += tool.offsets[axisIndex];
					move.end += tool.offsets[axisIndex];
				}
			}
			move.tool = tool;
		},
		setMoveAxis(move, axis) {
			const axisObj = this.move.axes.find(obj => obj.letter === axis);
			if (axisObj) {
				const axisIndex = this.move.axes.findIndex(item => item.letter === axis);
				move.start = Math.round((axis.min + axis.max) / 2 - (axis.max - axis.min) / 4);
				move.end = Math.round((axis.min + axis.max) / 2 + (axis.max - axis.min) / 4);
				if (move.tool) {
					move.start += move.tool.offsets[axisIndex];
					move.end += move.tool.offsets[axisIndex];
				}
			}
			move.axis = axis;
		},
		removeMove(index) {
			this.moves.splice(index, 1);
		},
		getMin(move, start) {
			if (!move.axis) {
				return null;
			}

			let min = null, axes = move.axis.split('+');
			for (let axis of this.move.axes) {
				if (axes.includes(axis.letter) && (min === null || min < axis.min)) {
					if (move.tool !== null) {
						switch (axis.letter) {
							case 'X':
								min = axis.min + move.tool.offsets[0];
								break;
							case 'Y':
								min = axis.min + move.tool.offsets[1];
								break;
						}
					} else {
						min = axis.min;
					}
				}
			}
			return start ? min : Math.max(min, move.start ?? min);
		},
		getMax(move, start) {
			if (!move.axis) {
				return null;
			}

			let max = null, axes = move.axis.split('+');
			for (let axis of this.move.axes) {
				if (axes.includes(axis.letter) && (max === null || max > axis.max)) {
					if (move.tool !== null) {
						switch (axis.letter) {
							case 'X':
								max = axis.max + move.tool.offsets[0];
								break;
							case 'Y':
								max = axis.max + move.tool.offsets[1];
								break;
						}
					} else {
						max = axis.max;
					}
				}
			}
			return start ? Math.min(max, move.end ?? max) : max;
		},
		getRules(move, start) {
			return [
				val => val >= this.getMin(move, start),
				val => val <= this.getMax(move, start)
			];
		},
		async doCode(code) {
			const reply = await this.sendCode(code);
			if (reply.indexOf('Error') === 0) {
				throw new Error(`Code ${code} failed: ${reply}`);
			}
		},
		getMoveFilename(move) {
			let filename = this.run.toString();
			if (move.tool) {
				filename += '-T' + move.tool.number;
			}
			filename += `-${move.axis.replace(/\+/g, '')}${move.start}-${move.end}-${move.accelerometer}-${this.move.shaping.type}`;
			if (this.move.shaping.type !== 'none' && this.move.shaping.type !== 'custom') {
				filename += `-${this.move.shaping.frequency}Hz-${this.move.shaping.damping}`;
			}
			filename += '.csv';
			return filename;
		},
		async waitForAccelerometerRun(accelerometerId) {
			if (this.cancelled) {
				throw new OperationCancelledError();
			}

			// Get board ID from accelerometer
			const matches = /(\d+)(\.\d+)?/.exec(accelerometerId);
			if (!matches) {
				throw new Error("Failed to get accelerometer board ID");
			}

			// Get board
			const board = this.boards.find(board => board.canAddress === parseInt(matches[1]));
			if (!board) {
				throw new Error("Failed to get accelerometer board");
			}

			// Wait for accelerometer runs to change
			let resolve, reject;
			const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
			const unwatch = this.$watch(() => board.accelerometer.runs || this.cancelled, () => {
				if (this.cancelled) {
					reject();
				} else {
					resolve();
				}
				unwatch();
			});
			return promise;
		},
		async recordMove(moveIndex, hadSelectedTool = false) {
			const move = this.moves[moveIndex];
			move.state = MoveState.recording;

			try {
				// Deal with tool selections
				if (move.tool) {
					await this.doCode(`T${move.tool.number}`);
					hadSelectedTool = true;
				} else if (hadSelectedTool) {
					await this.doCode('T-1');
					hadSelectedTool = false;
				}
				if (this.cancelled) {
					move.state = MoveState.cancelled;
					throw new OperationCancelledError();
				}

				// Go to the start position
				const moveAxes = move.axis.split('+');
				let startMoveParameters = moveAxes.map(axis => `${axis}${move.start}`).reduce((a, b) => a + ' ' + b);
				if (this.centerAxes) {
					if (!moveAxes.includes('X')) {
						startMoveParameters += move.tool ? ` X${this.xAxisCenter + move.tool.offsets[0]}` : ` X${this.xAxisCenter}`;
					}
					if (!moveAxes.includes('Y')) {
						startMoveParameters += move.tool ? ` Y${this.yAxisCenter + move.tool.offsets[1]}` : ` Y${this.yAxisCenter}`;
					}
					if (this.showZCenter) {
						startMoveParameters += move.tool ? ` Z${this.zAxisCenter + move.tool.offsets[2]}` : ` Z${this.zAxisCenter}`
					}
				}
				await this.doCode(`G1 ${startMoveParameters} F${this.maxSpeed}`);
				await this.doCode('G4 S1');
				if (this.cancelled) {
					move.state = MoveState.cancelled;
					throw new OperationCancelledError();
				}

				// Start sampling and move on to the end position
				const endMoveParameters = move.axis.split('+').map(axis => `${axis}${move.end}`).reduce((a, b) => a + ' ' + b);
				if (this.recordWholeMove) {
					await this.doCode(`M400 M956 P${move.accelerometer} S1000 A0 F"${this.getMoveFilename(move)}" G1 ${endMoveParameters} F${this.maxSpeed}`);
				} else {
					await this.doCode(`G1 ${endMoveParameters} F${this.maxSpeed} M400 M956 P${move.accelerometer} S1000 A0 F"${this.getMoveFilename(move)}"`);
				}
				await this.waitForAccelerometerRun(move.accelerometer);

				// Done, move on to the next move
				move.state = MoveState.finished;
				if (moveIndex + 1 < this.moves.length) {
					// Start the next move
					await this.recordMove(moveIndex + 1, hadSelectedTool);
				} else {
					// Sampling complete
					if (!this.cancelled) {
						this.$emit('finished');
					}
					this.finished = true;
				}
			} catch (e) {
				console.warn(`Sampling cancelled at move #${moveIndex}: ${e.message || e}`);
				move.state = MoveState.cancelled;
				this.cancelled = true;
			}
		},
		getMoveIcon(move) {
			switch (move.state) {
				case MoveState.idle: return 'mdi-asterisk';
				case MoveState.recording: return 'mdi-play';
				case MoveState.finished: return 'mdi-check';
				case MoveState.cancelled: return 'mdi-close';
			}
			return 'mdi-help-circle-outline';
		},
		cancel() {
			if (this.currentPage === 'collection' && !this.cancelled) {
				this.cancelled = this.finished = true;
			} else {
				this.shownInternal = false
			}
		},
		goBack() {
			switch (this.currentPage) {
				case 'config':
					this.currentPage = 'start';
					break;
			}
		},
		goNext() {
			switch (this.currentPage) {
				case 'start':
					this.moves.forEach(move => move.state = MoveState.idle);
					this.currentPage = 'config';
					break;
				case 'config':
					this.currentPage = 'collection';
					this.cancelled = false;
					this.recordMove(0);
					break;
			}
		}
	},
	mounted() {
		this.run = this.lastRun + 1;
		this.refreshCenters();
		this.makeMoves();
	},
	watch: {
		accelerometers() { this.makeMoves(); },
		'xAxis.min'() { this.makeMoves(); this.refreshCenters(); },
		'xAxis.max'() { this.makeMoves(); this.refreshCenters(); },
		'yAxis.min'() { this.makeMoves(); this.refreshCenters(); },
		'yAxis.max'() { this.makeMoves(); this.refreshCenters(); },
		'zAxis.min'() { this.refreshCenters(); },
		'zAxis.max'() { this.refreshCenters(); },
		shown(to) {
			if (to){
				this.run = this.lastRun + 1;
			} else {
				if (this.currentPage === 'collection') {
					// This will interrupt the current sampling
					this.cancelled = true;
				}
				this.currentPage = 'start';
				this.cancelled = this.finished = false;
			}
		},
		'state.status'(to) {
			if ((to === MachineStatus.disconnected || to === MachineStatus.off) && this.currentPage === 'collection') {
				this.cancelled = true;
			}
		}
	}
}
</script>