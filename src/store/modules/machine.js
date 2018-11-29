'use strict'

import { mapConnectorActions } from '../connector'

const ExpansionBoard = {
	name: undefined,
	revision: undefined,
	firmware: {
		name: undefined,
		version: undefined,
		date: undefined
	},
	vIn: {
		current: undefined,
		min: undefined,
		max: undefined
	},
	mcuTemp: undefined
}

const Fan = {
	value: undefined,
	name: undefined,
	inverted: undefined,
	frequency: undefined,
	minimum: undefined,
	maximum: undefined,
	blip: undefined,
	thermostatic: {
		heaters: [],
		temperature: undefined
	},
	pin: undefined
}

const Layer = {
	duration: undefined,
	height: undefined,				// layer height (not Z coordinate)
	filament: [],					// optional, consumed filament per extruder
	fractionPrinted: undefined		// optional
}

const NetworkInterface = {
	type: undefined,				// 0: Ethernet 1: WiFi
	speed: undefined,				// 0 if no link
	configuredIP: undefined,
	actualIP: undefined,
	subnet: undefined,
	gateway: undefined,
	numReconnects: undefined,
	activeProtocols: []				// one or more of ['http', 'ftp', 'telnet']
}

const Endstop = {
	position: undefined,			// 0: none 1: low end 2: high end
	type: undefined					// 0: active low 1: active high 3: zprobe 4: motor load detection
}	

const Storage = {
	mounted: undefined,
	speed: undefined,				// in Bytes/s
	capacity: undefined,			// in Bytes
	free: undefined,				// in Bytes
	openFiles: undefined
}

export default function(connector) {
	return {
		namespaced: true,
		state: {
			electronics: {
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
				mcuTemp: undefined,
				expansion: []
			},
			fans: [],
			heaters: {
				beds: [
					{
						active: undefined,
						standby: undefined,
						heaters: [0]
					}
				],
				chambers: [],				// same items as in 'beds'
				heaters: [					// may contain null elements as dummies (e.g. if no heated bed is present)
					{
						current: undefined,
						state: undefined,				// see RRF state enum
						model: {
							gain: undefined,
							timeConst: undefined,
							deadTime: undefined,
							maxPwm: undefined
						},
						sensor: undefined
					},
					{
						current: undefined,
						state: undefined,				// see RRF state enum
						model: {
							gain: undefined,
							timeConst: undefined,
							deadTime: undefined,
							maxPwm: undefined
						},
						sensor: undefined
					},
					{
						current: undefined,
						state: undefined,				// see RRF state enum
						model: {
							gain: undefined,
							timeConst: undefined,
							deadTime: undefined,
							maxPwm: undefined
						},
						sensor: undefined
					}
				]
			},
			job: {
				filename: undefined,
				layer: undefined,
				layerTime: undefined,
				extrudedRaw: [],
				fractionPrinted: undefined,
				printDuration: undefined,
				warmUpDuration: undefined,
				layers: [],					// may be only the first one on a Duet 2 but more on the Duet 3 (for print history, people want this)
				// ^-- alternatively this could be stored in a file that the web interface downloads from the board or using a dedicate request
				timesLeft: {
					file: undefined,
					filament: undefined,
					layer: undefined
				}
			},
			move: {
				currentMove: {
					requestedSpeed: undefined,
					topSpeed: undefined
				},
				geometry: {
					type: undefined
					// TODO: Expand this for delta/corexy/corexz
				},
				axes: [
					{
						letter: 'X',
						drives: [0],
						homed: true,
						min: undefined,
						max: undefined
					},
					{
						letter: 'Y',
						drives: [1],
						homed: true,
						min: undefined,
						max: undefined
					},
					{
						letter: 'Z',
						drives: [2],
						homed: true,
						min: undefined,
						max: undefined
					}
					// Optional axes go here. They can have { visible } too
				],
				extruders: [
					{
						factor: 1.0,
						drive: 3,
						nonlinear: {
							a: undefined,
							b: undefined,
							upperLimit: undefined,
							temperature: undefined
						}
					},
					{
						factor: 1.0,
						drive: 4,
						nonlinear: {
							a: undefined,
							b: undefined,
							upperLimit: undefined,
							temperature: undefined
						}
					}
				],
				drives: [
					{
						position: undefined,
						babystepping: {
							value: undefined,
							interpolated: undefined
						},
						instantDv: undefined,
						maxSpeed: undefined,
						acceleration: undefined
					},
					{
						position: undefined,
						babystepping: {
							value: undefined,
							interpolated: undefined
						},
						instantDv: undefined,
						maxSpeed: undefined,
						acceleration: undefined
					},
					{
						position: undefined,
						babystepping: {
							value: undefined,
							interpolated: undefined
						},
						instantDv: undefined,
						maxSpeed: undefined,
						acceleration: undefined
					},
					{
						position: undefined,
						babystepping: {
							value: undefined,
							interpolated: undefined
						},
						instantDv: undefined,
						maxSpeed: undefined,
						acceleration: undefined
					},
					{
						position: undefined,
						babystepping: {
							value: undefined,
							interpolated: undefined
						},
						instantDv: undefined,
						maxSpeed: undefined,
						acceleration: undefined
					}
				],
				speedFactor: 1.0,
				idle: {
					timeout: undefined,
					factor: undefined
				}
			},
			network: {
				name: (connector === undefined) ? 'Duet Web Control 2' : connector.hostname,
				password: undefined,
				interfaces: []
			},
			operation: {
				currentTool: undefined,
				mode: undefined,			// 0: FFF 1: Laser 2: CNC (see RRF)
				status: undefined			// see RRF status character
			},
			scanner: {
				// TODO
			},
			sensors: {
				endstops: [],
				probes: [
					{
						type: undefined,
						value: undefined,
						secondaryValue: undefined,
						speed: undefined,
						diveHeight: undefined,
						inverted: undefined,
						recoveryTime: undefined,
						travelSpeed: undefined,
						maxProbeCount: undefined,
						tolerance: undefined,
						disablesBed: undefined
					}
				],
				thermistors: [],
			},
			storages: [],
			tools: [
				{
					number: 0,
					name: undefined,
					extruders: [0],
					fan: 0,
					mix: [],
					heaters: [1],
					xAxes: [],
					yAxes: [],
					offsets: []						// offsets in the same order as the axes
				},
				{
					number: 1,
					name: undefined,
					extruders: [1],
					fan: 0,
					mix: [],
					heaters: [2],
					xAxes: [],
					yAxes: [],
					offsets: []						// offsets in the same order as the axes
				}
			],

			events: []
		},
		getters: {
			probeValues(state) {
				const result = state.sensors.probes.map(probe => probe.value);
				return (result.some(item => item)) ? result : [];
			},
			probeSecondaryValues(state) {
				const result = state.sensors.probes.map(probe => probe.secondaryValue);
				return (result.some(item => item)) ? result : [];
			},
		},
		actions: mapConnectorActions(connector),
		mutations: {
			log: (state, payload) => state.events.push(payload)
		}
	}
}
