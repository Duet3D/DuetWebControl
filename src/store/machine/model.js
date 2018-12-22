'use strict'

import { defaultBoardName, getBoardDefinition } from './boards.js'
import {
	Axis,
	BedOrChamber,
	Drive,
	ExtraHeater,
	Extruder,
	Heater,
	Probe,
	Tool,
	fixMachineItems
} from './modelItems.js'

import merge from '../../utils/merge.js'

export default function(connector) {
	return {
		namespaced: true,
		state: {
			electronics: {
				type: defaultBoardName,
				name: undefined,
				revision: undefined,
				firmware: {
					name: undefined,
					version: undefined,
					date: undefined
				},
				processorID: undefined,
				vIn: {
					current: undefined,
					min: undefined,
					max: undefined
				},
				mcuTemp: {
					current: undefined,
					min: undefined,
					max: undefined
				},
				expansionBoards: []
			},
			fans: [],
			heat: {
				beds: [									// may contain null items
					new BedOrChamber({
						number: 0,
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
				extrudedRaw: [],
				duration: undefined,
				filamentNeeded: [],
				fileName: undefined,
				lastFileName: undefined,
				lastFileSimulated: false,
				filePosition: undefined,
				fileSize: undefined,
				generatedBy: undefined,
				height: undefined,
				layer: undefined,
				layerHeight: undefined,
				layers: [],
				// ^-- this could be stored in a file that the web interface downloads from the board or using a dedicate request (Duet 2)
				layerTime: undefined,
				numLayers: undefined,
				warmUpDuration: undefined,
				timesLeft: {
					file: undefined,
					filament: undefined,
					layer: undefined
				}
			},
			messageBox: {
				mode: null,
				title: undefined,
				message: undefined,
				timeout: undefined,
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
				babystepZ: undefined,
				currentMove: {
					requestedSpeed: undefined,
					topSpeed: undefined
				},
				compensation: undefined,
				drives: [
					new Drive(),
					new Drive(),
					new Drive(),
					new Drive(),
					new Drive()
				],
				extruders: [
					new Extruder({
						factor: 1.0
					}),
					new Extruder({
						factor: 1.0
					})
				],
				geometry: {
					type: undefined
					// TODO Expand this for delta/corexy/corexz
				},
				idle: {
					timeout: undefined,
					factor: undefined
				},
				speedFactor: 1.0
			},
			network: {
				name: connector ? `(${connector.hostname})` : 'Duet Web Control 2',
				password: undefined,
				interfaces: []
			},
			scanner: {
				progress: undefined,
				status: undefined
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
				atxPower: undefined,
				currentTool: undefined,
				mode: undefined,						// one of ['FFF', 'CNC', 'Laser', undefined]
				status: undefined						// one of the following:
				// ['updating', 'off', 'halted', 'pausing', 'paused', 'resuming', 'processing', 'simulating', 'busy', 'changingTool', 'idle', undefined]
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
			fractionPrinted: state => state.job.fileSize ? state.job.filePosition / state.job.fileSize : 1,
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
					if (state.state.status !== 'simulating' && state.job.filamentNeeded.length && state.job.extrudedRaw.length) {
						return Math.min(1, state.job.extrudedRaw.reduce((a, b) => a + b) / state.job.filamentNeeded.reduce((a, b) => a + b));
					}
					return getters.fractionPrinted;
				}
				return 0.0;
			}
		},
		mutations: {
			update(state, payload) {
				const lastJobFile = state.job.fileName;
				const wasSimulating = state.state.status === 'simulating';

				merge(state, payload, true);
				fixMachineItems(state, payload);

				if (lastJobFile && state.job.fileName !== lastJobFile) {
					for (let key in state.job) {
						if (!(state.job[key] instanceof Array)) {
							if (state.job[key] instanceof Object) {
								for (let subkey in state.job[key]) {
									state.job[key][subkey] = undefined;
								}
							} else {
								state.job[key] = undefined;
							}
						}
					}

					state.job.lastFileName = lastJobFile;
					state.job.lastFileSimulated = wasSimulating;
				}
			}
		}
	}
}
