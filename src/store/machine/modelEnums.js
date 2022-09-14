'use strict'

export const AnalogSensorType = {
	thermistor: 'thermistor',
	pt1000: 'pt1000',
	max31865: 'rtdmax31865',
	max31855: 'thermocouplemax31855',
	max31856: 'thermocouplemax31856',
	linearAnalog: 'linearanalog',
	dht11: 'dht11',
	dht21: 'dht21',
	dht22: 'dht22',
	dhtHumidity: 'dhthumidity',
	currentLoop: 'currentlooppyro',
	mcuTemp: 'mcutemp',
	drivers: 'drivers',
	driversDuex: 'driversduex',
	unknown: 'unknown'
}

export const BoardState = {
	unknown: 'unknown',
	flashing: 'flashing',
	flashFailed: 'flashFailed',
	resetting: 'resetting',
	running: 'running'
}

export const Compatibility = {
	default: 'Default',
	repRapFirmware: 'RepRapFirmware',
	marlin: 'Marlin',
	teacup: 'Teacup',
	sprinter: 'Sprinter',
	repetier: 'Repetier',
	nanoDlp: 'NanoDLP'
}

export const CompensationType = {
	none: 'none',
	mesh: 'mesh'
}

export const DistanceUnit = {
	mm: 'mm',
	inch: 'in',
}

export const EndstopType = {
	inputPin: 'inputPin',
	zProbeAsEndstop: 'zProbeAsEndstop',
	motorStallAny: 'motorStallAny',
	motorStallIndividual: 'motorStallIndividual',
	unknown: 'unknown'
}

export const FilamentMonitorStatus = {
	noMonitor: 'noMonitor',
	ok: 'ok',
	noDataReceived: 'noDataReceived',
	noFilament: 'noFilament',
	tooLittleMovement: 'tooLittleMovement',
	tooMuchMovement: 'tooMuchMovement',
	sensorError: 'sensorError'
}

export const FilamentMonitorType = {
	simple: 'simple',
	laser: 'laser',
	pulsed: 'pulsed',
	rotatingMagnet: 'rotatingMagnet',
	unknown: 'unknown'
}

export const HeaterMonitorAction = {
	generateFault: 0,
	permanentSwitchOff: 1,
	temporarySwitchOff: 2,
	shutDown: 3
}

export const HeaterMonitorCondition = {
	disabled: 'disabled',
	tooHigh: 'tooHigh',
	tooLow: 'tooLow',
	undefined: 'undefined'
}

export const HeaterState = {
	disconnected: 'disconnected',
	off: 'off',
	standby: 'standby',
	active: 'active',
	fault: 'fault',
	tuning: 'tuning',
	offline: 'offline'
}

export const HttpEndpointType = {
	get: 'GET',
	post: 'POST',
	put: 'PUT',
	patch: 'PATCH',
	trace: 'TRACE',
	delete: 'DELETE',
	options: 'OPTIONS',
	webSocket: 'WebSocket'
}

export const InputChannelName = {
	http: 'HTTP',
	telnet: 'Telnet',
	file: 'File',
	usb: 'USB',
	aux: 'Aux',
	trigger: 'Trigger',
	queue: 'Queue',
	lcd: 'LCD',
	sbc: 'SBC',
	daemon: 'Daemon',
	autoPause: 'Autopause'
}

export const InputChannelState = {
	awaitingAcknowledgement: 'awaitingAcknowledgement',
	idle: 'idle',
	executing: 'executing',
	waiting: 'waiting',
	reading: 'reading'
}

export const KinematicsName = {
	cartesian: 'cartesian',
	coreXY: 'coreXY',
	coreXYU: 'coreXYU',
	coreXYUV: 'coreXYUV',
	coreXZ: 'coreXZ',
	markForged: 'markForged',
	fiveBarScara: 'FiveBarScara',
	hangprinter: 'Hangprinter',
	delta: 'delta',
	polar: 'Polar',
	rotaryDelta: 'Rotary delta',
	scara: 'Scara',
	unknown: 'unknown'
}

export const LogLevel = {
	debug: 'debug',
	info: 'info',
	warn: 'warn',
	off: 'off'
}

export const InputShapingType = {
	none: 'none',
	MZV: 'mzv',
	ZVD: 'zvd',
	ZVDD: 'zvdd',
	ZVDDD: 'zvddd',
	EI2: 'ei2',
	EI3: 'ei3',
	custom: 'custom'
}

export const MachineMode = {
	fff: 'FFF',
	cnc: 'CNC',
	laser: 'Laser'
}

export const MessageBoxMode = {
	noButtons: 0,		// non-blocking
	closeOnly: 1,		// non-blocking
	okOnly: 2,			// blocking
	okCancel: 3			// blocking, requires M292 (P1) to continue
}

export const MessageType = {
	success: 0,
	warning: 1,
	error: 2
}

export const NetworkInterfaceType = {
	lan: 'lan',
	wifi: 'wifi'
}

export const ProbeType = {
	none: 0,
	analog: 1,
	dumbModulated: 2,
	alternateAnalog: 3,
	endstopSwitch_obsolete: 4,
	digital: 5,
	e1Switch_obsolete: 6,
	zSwitch_obsolete: 7,
	unfilteredDigital: 8,
	blTouch: 9,
	zMotorStall: 10
}

export const StatusType = {
    disconnected: 'disconnected',
	starting: 'starting',
	updating: 'updating',
	off: 'off',
	halted: 'halted',
	pausing: 'pausing',
	paused: 'paused',
	resuming: 'resuming',
	cancelling: 'cancelling',
	processing: 'processing',
	simulating: 'simulating',
	busy: 'busy',
	changingTool: 'changingTool',
	idle: 'idle'
}

export const SpindleState = {
	unconfigured: 'unconfigured',
	stopped: 'stopped',
	forward: 'forward',
	reverse: 'reverse'
}

export const ThumbnailFormat = {
	jpeg: 'jpeg',
	qoi: 'qoi',
	png: 'png'
}

export const ToolState = {
	off: 'off',
	active: 'active',
	standby: 'standby'
}

export function isPaused(status) {
	return (status === StatusType.pausing ||
			status === StatusType.paused ||
			status === StatusType.cancelling ||
			status === StatusType.resuming);
}

export function isPrinting(status) {
	return (status === StatusType.pausing ||
			status === StatusType.paused ||
			status === StatusType.cancelling ||
			status === StatusType.resuming ||
			status === StatusType.processing ||
			status === StatusType.simulating);
}
