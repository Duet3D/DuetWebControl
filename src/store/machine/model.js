'use strict'

import { defaultBoardName, getBoardDefinition } from './boards.js'
import {
	Axis,
	Channel,
	BedOrChamber,
	Drive,
	ExtraHeater,
	Extruder,
	FileInfo,
	Firmware,
	Heater,
	Probe,
	Tool,
	fixMachineItems
} from './modelItems.js'

import patch from '../../utils/patch.js'

export default function(connector) {
	return {
		namespaced: true,
		state: {
			channels: {
				http: new Channel(),
				telnet: new Channel(),
				file: new Channel(),
				usb: new Channel(),
				aux: new Channel(),
				daemon: new Channel(),
				codeQueue: new Channel(),
				lcd: new Channel(),
				spi: new Channel(),
				autoPause: new Channel()
			},
			electronics: {
				type: defaultBoardName,
				name: null,
				revision: null,
				firmware: new Firmware(),
				processorID: null,
				vIn: {
					current: null,
					min: null,
					max: null
				},
				mcuTemp: {
					current: null,
					min: null,
					max: null
				},
				expansionBoards: []
			},
			fans: [],
			heat: {
				beds: [									// may contain null items
					new BedOrChamber({
						heaters: [0]
					})
				],
				chambers: [],							// same structure as 'beds'
				coldExtrudeTemperature: 160,
				coldRetractTemperature: 90,
				extra: [
					new ExtraHeater({
						name: 'MCU'
					})
				],
				heaters: [								// may contain null elements as dummies (e.g. if no heated bed is present)
					new Heater(),
					new Heater(),
					new Heater()
				]
			},
			job: {
				file: new FileInfo(),
				filePosition: null,

				lastFileName: null,
				lastFileSimulated: false,

				extrudedRaw: [],						// virtual amount extruded without any modifiers like mixing or extrusion factors
				duration: null,
				layer: null,
				layerTime: null,
				layers: [],
				// ^-- this could be stored in a file that the web interface downloads from the board or using a dedicate request (Duet 2)

				warmUpDuration: null,
				timesLeft: {
					file: null,
					filament: null,
					layer: null
				}
			},
			messageBox: {
				mode: null,
				title: null,
				message: null,
				timeout: null,
				axisControls: []						// provides axis indices
			},
			move: {
				axes: [
					new Axis({
						letter: 'X',
						drives: [0],
						homed: true,
						visible: true
					}),
					new Axis({
						letter: 'Y',
						drives: [1],
						homed: true,
						visible: true
					}),
					new Axis({
						letter: 'Z',
						drives: [2],
						homed: true,
						visible: true
					})
				],
				babystepZ: null,
				currentMove: {
					requestedSpeed: null,
					topSpeed: null
				},
				compensation: null,
				drives: [
					new Drive(),
					new Drive(),
					new Drive(),
					new Drive(),
					new Drive()
				],
				extruders: [
					new Extruder(),
					new Extruder()
				],
				geometry: {
					type: null
					// TODO Expand this for delta/corexy/corexz
				},
				idle: {
					timeout: null,
					factor: null
				},
				speedFactor: 1.0
			},
			network: {
				name: connector ? `(${connector.hostname})` : 'Duet Web Control 2',
				password: null,
				interfaces: []
			},
			scanner: {
				progress: null,
				status: null
			},
			sensors: {
				endstops: [],
				probes: [
					new Probe()
				]
				// sensors: []							// TODO thermistors etc
			},
			spindles: [],
			state: {
				isPrinting: false,						// auto-evaluated on update
				isSimulating: false,					// auto-evaluated on update

				atxPower: null,
				currentTool: null,
				mode: null,								// one of ['FFF', 'CNC', 'Laser', null]
				status: null							// one of the following:
				// ['updating', 'off', 'halted', 'pausing', 'paused', 'resuming', 'processing', 'simulating', 'busy', 'changingTool', 'idle', null]
			},
			storages: [],
			tools: [
				new Tool({
					number: 0,
					active: [0],
					standby: [0],
					heaters: [1],
					extruders: [0]
				}),
				new Tool({
					number: 1,
					active: [0],
					standby: [0],
					heaters: [2],
					extruders: [1]
				})
			]
		},
		getters: {
			board: state => getBoardDefinition(state.electronics.type),
			currentTool(state) {
				if (state.state.currentTool >= 0) {
					return state.tools[state.state.currentTool];
				}
				return null;
			},
			fractionPrinted: state => (state.job.filePosition && state.job.file.size) ? state.job.filePosition / state.job.file.size : 0,
			isPrinting: state => ['pausing', 'paused', 'resuming', 'processing', 'simulating'].indexOf(state.state.status) !== -1,
			isPaused: state => ['pausing', 'paused', 'resuming'].indexOf(state.state.status) !== -1,
			maxHeaterTemperature(state) {
				let maxTemp
				state.heat.heaters.forEach(function(heater) {
					if (maxTemp === undefined || heater.max > maxTemp) {
						maxTemp = heater.max;
					}
				});
				return maxTemp;
			},
			jobProgress(state, getters) {
				if (getters.isPrinting) {
					if (state.state.status !== 'simulating' && state.job.file.filament.length && state.job.extrudedRaw.length) {
						return Math.min(1, state.job.extrudedRaw.reduce((a, b) => a + b) / state.job.file.filament.reduce((a, b) => a + b));
					}
					return getters.fractionPrinted;
				}
				return state.job.lastFileName ? 1 : 0;
			}
		},
		mutations: {
			update(state, payload) {
				const lastJobFile = state.job.file.fileName;
				const wasPrinting = state.state.isPrinting, wasSimulating = state.state.isSimulating;

				patch(state, payload, true);
				fixMachineItems(state, payload);

				const isPrinting = ['pausing', 'paused', 'resuming', 'processing', 'simulating'].indexOf(state.state.status) !== -1;
				if (state.state.isPrinting !== isPrinting) {
					state.state.isPrinting = isPrinting;
					if (isPrinting) {
						const isSimulating = state.state.status === 'simulating';
						if ((isSimulating || state.state.status === 'processing') && state.state.isSimulating !== isSimulating) {
							state.state.isSimulating = isSimulating;
						}
					} else if (wasPrinting) {
						state.state.isSimulating = false;

						state.job.lastFileName = lastJobFile;
						state.job.lastFileSimulated = wasSimulating;
					}
				}
			}
		}
	}
}
