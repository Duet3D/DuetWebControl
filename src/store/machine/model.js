'use strict'

import { defaultBoard } from './boards.js'
import {
	Axis,
	BedOrChamber,
	Drive,
	ExtraHeater,
	Extruder,
	Heater,
	Probe,
	Tool
} from './modelItems.js'

export default function(connector) {
	return {
		electronics: {
			type: undefined,
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
			board: defaultBoard,
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
			filename: undefined,
			layer: undefined,
			layerTime: undefined,
			extrudedRaw: [],
			filePosition: undefined,
			fractionPrinted: undefined,
			printDuration: undefined,
			warmUpDuration: undefined,
			layers: [],
			// ^-- this could be stored in a file that the web interface downloads from the board or using a dedicate request (Duet 2)
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
			controls: undefined
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
			mode: undefined,
			status: undefined						// see RRF status character
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
	}
}
