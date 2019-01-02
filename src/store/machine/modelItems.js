'use strict'

import merge from '../../utils/merge.js'

class Axis {
	constructor(initData) { merge(this, initData, true); }
	letter = undefined				// must be upper-case
	drives = []
	homed = undefined
	machinePosition = undefined
	min = undefined
	max = undefined
	visible = undefined
}

class BedOrChamber {
	constructor(initData) { merge(this, initData, true); }
	number = undefined
	active = undefined
	standby = undefined
	name = undefined
	heaters = []
}

class Drive {
	constructor(initData) { merge(this, initData, true); }
	position = undefined
	babystepping = {
		value: undefined,
		interpolated: undefined
	}
	current = undefined
	acceleration = undefined
	minSpeed = undefined
	maxSpeed = undefined
}

class Endstop {
	constructor(initData) { merge(this, initData, true); }
	triggered = undefined
	position = undefined			// 0: none, 1: low end 2: high end
	type = undefined				// 0: active low, 1: active high, 3: zprobe, 4: motor load detection
}

class ExpansionBoard {
	constructor(initData) { merge(this, initData, true); }
	name = undefined
	revision = undefined
	firmware = {
		name: undefined,
		version: undefined,
		date: undefined
	}
	vIn = {
		current: undefined,
		min: undefined,
		max: undefined
	}
	mcuTemp = undefined
	maxHeaters = undefined
	maxMotors = undefined
}

class ExtraHeater {
	constructor(initData) { merge(this, initData, true); }
	current = undefined
	name = undefined
	state = undefined
	sensor = undefined
}

class Extruder {
	constructor(initData) { merge(this, initData, true); }
	factor = 1.0
	nonlinear = {
		a: undefined,
		b: undefined,
		upperLimit: undefined,
		temperature: undefined
	}
}

class Fan {
	constructor(initData) { merge(this, initData, true); }
	value = undefined
	name = undefined
	rpm = undefined
	inverted = undefined
	frequency = undefined
	minimum = undefined
	maximum = undefined
	blip = undefined
	thermostatic = {
		control: false,
		heaters: [],
		temperature: undefined
	}
	pin = undefined
}

class Heater {
	constructor(initData) { merge(this, initData, true); }
	current = undefined
	name = undefined
	state = undefined				// see RRF state enum
	model = {
		gain: undefined,
		timeConst: undefined,
		deadTime: undefined,
		maxPwm: undefined
	}
	max = undefined
	sensor = undefined
}

class Layer {
	constructor(initData) { merge(this, initData, true); }
	duration = undefined
	height = undefined
	filament = []
	fractionPrinted = undefined
}

class NetworkInterface {
	constructor(initData) { merge(this, initData, true); }
	type = undefined				// one of ['wifi', 'lan']
	firmwareVersion = undefined
	speed = undefined				// 0 if no link
	signal = undefined				// only WiFi
	configuredIP = undefined
	actualIP = undefined
	subnet = undefined
	gateway = undefined
	numReconnects = undefined
	activeProtocols = []			// one or more of ['http' 'ftp' 'telnet']
}

class Probe {
	constructor(initData) { merge(this, initData, true); }
	type = undefined
	value = undefined
	secondaryValues = []
	threshold = undefined
	speed = undefined
	diveHeight = undefined
	triggerHeight = undefined
	inverted = undefined
	recoveryTime = undefined
	travelSpeed = undefined
	maxProbeCount = undefined
	tolerance = undefined
	disablesBed = undefined
}

class Spindle {
	constructor(initData) { merge(this, initData, true); }
	active = undefined				// RPM
	current = undefined				// RPM
}

class Storage {
	constructor(initData) { merge(this, initData, true); }
	mounted = undefined
	speed = undefined				// in Bytes/s
	capacity = undefined			// in Bytes
	free = undefined				// in Bytes
	openFiles = undefined
}

class Tool {
	constructor(initData) { merge(this, initData, true); }
	number = undefined
	active = []
	standby = []
	name = undefined
	filament = undefined
	fans = []
	heaters = []
	extruders = []
	mix = []
	spindle = undefined
	axes = []
	offsets = []						// offsets in the same order as the axes
}

export {
	Axis,
	BedOrChamber,
	Drive,
	Endstop,
	ExpansionBoard,
	ExtraHeater,
	Extruder,
	Fan,
	Heater,
	Layer,
	NetworkInterface,
	Probe,
	Spindle,
	Storage,
	Tool
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
