'use strict'

import { quickPatch } from '../../utils/patch.js'

export class Axis {
	constructor(initData) { quickPatch(this, initData); }
	letter = null				// must be upper-case
	drives = []
	homed = null
	machinePosition = null
	min = null
	max = null
	visible = null
}

export class BedOrChamber {
	constructor(initData) { quickPatch(this, initData); }
	number = null
	active = []
	standby = []
	name = null
	heaters = []
}

export class Drive {
	constructor(initData) { quickPatch(this, initData); }
	position = null
	babystepping = {
		value: null,
		interpolated: null
	}
	current = null
	acceleration = null
	minSpeed = null
	maxSpeed = null
}

export class Endstop {
	constructor(initData) { quickPatch(this, initData); }
	triggered = false
	position = 0				// 0: none, 1: low end 2: high end
	type = 0					// 0: active low, 1: active high, 3: zprobe, 4: motor load detection
}

export class ExpansionBoard {
	constructor(initData) { quickPatch(this, initData); }
	name = null
	revision = null
	firmware = new Firmware()
	vIn = {
		current: null,
		min: null,
		max: null
	}
	mcuTemp = {
		current: null,
		min: null,
		max: null
	}
	maxHeaters = null
	maxMotors = null
}

export class ExtraHeater {
	constructor(initData) { quickPatch(this, initData); }
	current = null
	name = null
	state = null
	sensor = null
}

export class Extruder {
	constructor(initData) { quickPatch(this, initData); }
	factor = 1.0
	nonlinear = {
		a: 0,
		b: 0,
		upperLimit: 0.2,
		temperature: 0
	}
}

export class Fan {
	constructor(initData) { quickPatch(this, initData); }
	value = null
	name = null
	rpm = null
	inverted = false
	frequency = null
	min = 0.0
	max = 1.0
	blip = 0.1
	thermostatic = {
		control: true,
		heaters: [],
		temperature: null
	}
	pin = null
}

export class FileInfo {
	constructor(initData) {
		if (initData) {
			quickPatch(this, initData);
			if (!this.numLayers && initData.height && initData.firstLayerHeight && initData.layerHeight) {
				this.numLayers = Math.round((initData.height - initData.firstLayerHeight) / initData.layerHeight) + 1
			}
		}
	}
	fileName = null
	size = null
	filament = []
	generatedBy = null
	height = null
	firstLayerHeight = null
	layerHeight = null
	numLayers = null
	printTime = null
	simulatedTime = null
}

export class Firmware {
	name = null
	version = null
	date = null
}

export class Heater {
	constructor(initData) { quickPatch(this, initData); }
	current = null
	name = null
	state = null				// see RRF state enum
	model = {
		gain: null,
		timeConst: null,
		deadTime: null,
		maxPwm: null
	}
	max = null
	sensor = null
}

export class Layer {
	constructor(initData) { quickPatch(this, initData); }
	duration = null
	height = null
	filament = []
	fractionPrinted = null
}

export class NetworkInterface {
	constructor(initData) { quickPatch(this, initData); }
	type = null					// one of ['wifi', 'lan']
	firmwareVersion = null
	speed = null				// null if unknown and 0 if no link
	signal = null				// only WiFi (dBm)
	configuredIP = null
	actualIP = null
	subnet = null
	gateway = null
	numReconnects = null
	activeProtocols = []		// one or more of ['http' 'ftp' 'telnet']
}

export class Probe {
	constructor(initData) { quickPatch(this, initData); }
	type = null
	value = null
	secondaryValues = []
	threshold = 500
	speed = 2
	diveHeight = 5
	triggerHeight = 0.7
	inverted = false
	recoveryTime = 0
	travelSpeed = 100
	maxProbeCount = 1
	tolerance = 0.03
	disablesBed = false
}

export class Spindle {
	constructor(initData) { quickPatch(this, initData); }
	active = null				// RPM
	current = null				// RPM
}

export class Storage {
	constructor(initData) { quickPatch(this, initData); }
	mounted = null
	speed = null				// in Bytes/s
	capacity = null				// in Bytes
	free = null					// in Bytes
	openFiles = null
}

export class Tool {
	constructor(initData) { quickPatch(this, initData); }
	number = null
	active = []
	standby = []
	name = null
	filament = null
	fans = []
	heaters = []
	extruders = []
	mix = []
	spindle = -1
	axes = []							// may hold sub-arrays of drives per axis
	offsets = []						// offsets in the same order as the axes
}

function fixObject(item, preset) {
	let fixed = false;
	for (let key in preset) {
		if (!item.hasOwnProperty(key)) {
			item[key] = preset[key];
			fixed = true;
		} else if (!(item[key] instanceof Array) && item[key] instanceof Object) {
			fixed |= fixObject(item[key], preset[key]);
		}
	}
	return fixed;
}

function fixItems(items, ClassType) {
	let preset = new ClassType();
	items.forEach(function(item) {
		if (item !== null) {
			for (let key in preset) {
				if (!item.hasOwnProperty(key)) {
					item[key] = preset[key];
					if (preset[key] instanceof Object) {
						preset = new ClassType();
					}
				} else if (preset[key] instanceof Object) {
					if (fixObject(item[key], preset[key])) {
						preset = new ClassType();
					}
				}
			}
		}
	});
}

// TODO: Eventually this could be combined with the 'merge' function
// But getting everything the way it's supposed to work took longer than expected anyway...
export function fixMachineItems(state, mergeData) {
	if (mergeData.cnc && mergeData.cnc.spindles) {
		fixItems(state.cnc.spindles, Spindle);
	}

	if (mergeData.electronics && mergeData.electronics.expansionBoards) {
		fixItems(state.electronics.expansionBoards, ExpansionBoard);
	}

	if (mergeData.fans) {
		fixItems(state.fans, Fan);
	}

	if (mergeData.heat) {
		if (mergeData.heat.beds) {
			fixItems(state.heat.beds, BedOrChamber);
		}
		if (mergeData.heat.chambers) {
			fixItems(state.heat.chambers, BedOrChamber);
		}
		if (mergeData.heat.extra) {
			fixItems(state.heat.extra, ExtraHeater);
		}
		if (mergeData.heat.heaters) {
			fixItems(state.heat.heaters, Heater);
		}
	}

	// Layers are not verified for performance reasons

	if (mergeData.move) {
		if (mergeData.move.axes) {
			fixItems(state.move.axes, Axis);
		}
		if (mergeData.move.drives) {
			fixItems(state.move.drives, Drive);
		}
		if (mergeData.move.extruders) {
			fixItems(state.move.extruders, Extruder);
		}
	}

	if (mergeData.network && mergeData.network.interfaces) {
		fixItems(state.network.interfaces, NetworkInterface);
	}

	if (mergeData.sensors) {
		if (mergeData.sensors.endstops) {
			fixItems(state.sensors.endstops, Endstop);
		}
		if (mergeData.sensors.probes) {
			fixItems(state.sensors.probes, Probe);
		}
	}

	if (mergeData.storages) {
		fixItems(state.storages, Storage);
	}

	if (mergeData.tools) {
		fixItems(state.tools, Tool);
	}
}
