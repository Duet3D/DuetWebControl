'use strict'

import Vue from 'vue'

import {
	AnalogSensorType,
	BoardState,
	Compatibility,
	DistanceUnit,
	EndstopType,
	FilamentMonitorStatus,
	FilamentMonitorType,
	HeaterMonitorAction, HeaterMonitorCondition,
	HttpEndpointType,
	InputChannelState,
	KinematicsName,
	MessageBoxMode,
	MessageType,
	NetworkInterfaceType,
	ProbeType,
	SpindleState,
	ToolState
} from './modelEnums.js'
import { PluginManifest } from '@/plugins/manifest'
import { quickPatch } from '@/utils/patch'

export class Accelerometer {
	constructor(initData) { quickPatch(this, initData); }
	points = 0
	runs = 0
}

export class ClosedLoop {
	constructor(initData) { quickPatch(this, initData); }
	points = 0
	runs = 0
}

export class AnalogSensor {
	constructor(initData) { quickPatch(this, initData); }
	lastReading = null
	name = ''
	type = AnalogSensorType.unknown
}

export class Axis {
	constructor(initData) { quickPatch(this, initData); }
	acceleration = 500
	babystep = 0
	current = 0
	drivers = []
	homed = false
	jerk = 15
	letter = '\0'
	machinePosition = null
	max = 200
	maxProbed = false
	microstepping = {
		interpolated: false,
		value: 16
	}
	min = 0
	minProbed = false
	percentCurrent = 100
	percentStstCurrent = null
	speed = 100
	stepsPerMm = 80
	userPosition = null
	visible = true
	workplaceOffsets = []
}

export class BeepRequest {
	constructor(initData) { quickPatch(this, initData); }
	duration = 0
	frequency = 0
}

export class Board {
	constructor(initData) {
        overloadProperty(this, 'accelerometer', value => new Accelerometer(value));
		overloadProperty(this, 'closedLoop', value => new ClosedLoop(value));
		overloadProperty(this, 'mcuTemp', value => new MinMaxCurrent(value));
        overloadProperty(this, 'v12', value => new MinMaxCurrent(value));
        overloadProperty(this, 'vIn', value => new MinMaxCurrent(value));
        quickPatch(this, initData);
    }
	accelerometer = null
	bootloaderFileName = null
	canAddress = null
	closedLoop = null
	directDisplay = {
		pulsesPerClick: 0,
		spiFreq: 0,
		typeName: null
	}
	firmwareDate = ''
	firmwareFileName = null
	firmwareName = ''
	firmwareVersion = ''
	iapFileNameSBC = null		// *** requires SBC support
	iapFileNameSD = null		// *** requires SD support
	maxHeaters = 0
	maxMotors = 0
    mcuTemp = null
	name = ''
	shortName = ''
	state = BoardState.unknown
	supportsDirectDisplay = false
	v12 = null
	vIn = null
}

export class Build {
	constructor(initData) {
		overloadPushMethod(this.objects, value => new BuildObject(value));
		quickPatch(this, initData);
	}
	currentObject = -1
	m486Names = false
	m486Numbers = false
	objects = []
}

export class BuildObject {
	constructor(initData) { quickPatch(this, initData); }
	cancelled = false
	name = null
	x = []
	y = []
}

export class Endstop {
	constructor(initData) { quickPatch(this, initData); }
	highEnd = false
	triggered = false
	type = EndstopType.unknown
}

export class Extruder {
	constructor(initData) { quickPatch(this, initData); }
	acceleration = 500
	current = 0
	driver = null
	factor = 1.0
	filament = ''
	jerk = 15
	microstepping = {
		interpolated: false,
		value: 16
	}
	nonlinear = {
		a: 0,
		b: 0,
		upperLimit: 0.2
	}
	percentCurrent = 100
	percentStstCurrent = null
	position = 0
	pressureAdvance = 0
	rawPosition = 0			// *** deprecated as of v3.3, to be replaced with job.rawExtrusion
	speed = 100
	stepsPerMm = 420
}

export class Fan {
	constructor(initData) { quickPatch(this, initData); }
	actualValue = -1
	blip = 0.1
	frequency = 250
	max = 1
	min = 0.1
	name = ''
	requestedValue = 0
	rpm = -1
	thermostatic = {
		heaters: [],
		highTemperature: null,
		lowTemperature: null
	}
}

export class FilamentMonitor {
	constructor(initData) { quickPatch(this, initData); }
	enabled = false
	status = FilamentMonitorStatus.noDataReceived
	type = FilamentMonitorType.unknown
}

export class LaserFilamentMonitor extends FilamentMonitor {
	constructor(initData) {
		super(initData);
		this.type = FilamentMonitorType.laser;
	}

	calibrated = {
		percentMax: 0,
		percentMin: 0,
		sensivity: 0,
		totalDistance: 0
	}
	configured = {
		allMoves: false,
		percentMax: 160,
		percentMin: 60,
		sampleDistance: 3.0
	}
}

export class PulsedFilamentMonitor extends FilamentMonitor {
	constructor(initData) {
		super(initData);
		this.type = FilamentMonitorType.pulsed;
	}

	calibrated = {
		mmPerPulse: 0,
		percentMax: 0,
		percentMin: 0,
		totalDistance: 0
	}
	configured = {
		mmPerPulse: 1,
		percentMax: 160,
		percentMin: 60,
		sampleDistance: 5
	}
}

export class RotatingMagnetFilamentMonitor extends FilamentMonitor {
	constructor(initData = {}) {
		super(initData);
		this.type = FilamentMonitorType.rotatingMagnet;
	}

	calibrated = {
		mmPerRev: 0,
		percentMax: 0,
		percentMin: 0,
		totalDistance: 0
	}
	configured = {
		allMoves: false,
		mmPerRev: 28.8,
		percentMax: 160,
		percentMin: 60,
		sampleDistance: 3
	}
}

export class GpInputPort {
	constructor(initData) { quickPatch(this, initData); }
	value = 0
}

export class GpOutputPort {
	constructor(initData) { quickPatch(this, initData); }
	pwm = 0
}

export class Heater {
	constructor(initData) {
        overloadPushMethod(this.monitors, value => new HeaterMonitor(value));
        quickPatch(this, initData);
    }
	active = 0
	current = -273.15
	max = 285
	min = -10
	model = {
        coolingExp: 1.35,
        coolingRate: 0.56,
		deadTime: 5.5,
		enabled: false,
        fanCoolingRate: 0.56,
        heatingRate: 2.43,
		inverted: false,
		maxPwm: 1,
		pid: {
			overridden: false,
			d: 0.0,
			i: 0.0,
			p: 0.0,
			used: true
		},
		standardVoltage: 0
	}
	monitors = []
	sensor = -1
	standby = 0
	state = null
}

export class HeaterMonitor {
	action = HeaterMonitorAction.generateFault
	condition = HeaterMonitorCondition.disabled
	limit = null
}

export class HttpEndpoint {
	constructor(initData) { quickPatch(this, initData); }
	endpointType = HttpEndpointType.get
	namespace = ''
	path = ''
	unixSocket = ''
}

export class InputChannel {
	constructor(initData) { quickPatch(this, initData); }
	axesRelative = false
	compatibility = Compatibility.repRapFirmware
	distanceUnit = DistanceUnit.mm
	drivesRelative = false
	feedRate = 50
	inMacro = false
	lineNumber = 0
	macroRestartable = false
	name = null
	stackDepth = 0
	state = InputChannelState.idle
	volumetric = false
}

export class Kinematics {
    constructor(initData) {
        overloadProperty(this, 'segmentation', value => new MoveSegmentation(value));
        quickPatch(this, initData);
    }
	name = KinematicsName.unknown
	segmentation = null
}

export class ZLeadscrewKinematics extends Kinematics {
	constructor(initData) { super(initData); }
	tiltCorrection = {
		correctionFactor: 0,
		lastCorrections: [],
		maxCorrection: 0,
		screwPitch: 0,
		screwX: [],
		screwY: []
	}
}

export class CoreKinematics extends ZLeadscrewKinematics {
	constructor(initData) { super(initData); }
	forwardMatrix = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	]
	inverseMatrix = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	]
}

export class DeltaKinematics extends Kinematics {
	constructor(initData) {
		super({});
		overloadPushMethod(this.towers, value => new DeltaTower(value));
		quickPatch(initData);
	}
	deltaRadius = 105.6
	homedHeight = 240
	printRadius = 80
	towers = [
		new DeltaTower(),
		new DeltaTower(),
		new DeltaTower()
	]
	xTilt = 0
	yTilt = 0
}

export class DeltaTower {
	constructor(initData) { quickPatch(this, initData); }
	angleCorrection = 0
	diagonal = 0
	endstopAdjustment = 0
	xPos = 0
	yPos = 0
}

export class HangprinterKinematics extends Kinematics {
	constructor(initData) { super(initData); }
	anchors = [
		[0, -2000, -100],
		[2000, 1000, -100],
		[-2000, 1000, -100],
		[0, 0, 3000]
	]
	printRadius = 1500
}

export class ScaraKinematics extends ZLeadscrewKinematics {
	constructor(initData) { super(initData); }
}

export class Layer {
	constructor(initData) { quickPatch(this, initData); }
	duration = 0
	filament = []
	fractionPrinted = 0
	height = 0
	temperatures = []
}

export class MeshDeviation {
	constructor(initData) { quickPatch(this, initData); }
	deviation = 0
	mean = 0
}

export class Message {
	constructor(initData) { quickPatch(this, initData); }
	time = new Date()
	type = MessageType.success
	content = ''
}

export class MessageBox {
	constructor(initData) { quickPatch(this, initData); }
	axisControls = 0
	mode = MessageBoxMode.okOnly
	message = ''
	seq = -1
	title = ''
	timeout = 0
}

export class MinMaxCurrent {
    constructor(initData) { quickPatch(this, initData); }
	current = 0
	max = 0
	min = 0
}

export class MoveQueueItem {
	constructor(initData) { quickPatch(this, initData); }
	gracePeriod = 0
	length = 0
}

export class MoveSegmentation {
    constructor(initData) { quickPatch(this, initData); }
	segmentsPerSec = 0
	minSegmentLength = 0
}

export class NetworkInterface {
	constructor(initData) { quickPatch(this, initData); }
	actualIP = null
	firmwareVersion = null
	gateway = null
	mac = null
	subnet = null
	type = NetworkInterfaceType.wifi

	// *** missing in DSF:
	state = null				// one of [null, 'disabled', 'enabled', 'starting1', 'starting2', 'changingMode', 'establishingLink', 'obtainingIP', 'connected', 'active']

	// *** missing in RRF:
	activeProtocols = []		// one or more of ['http', 'https', 'ftp', 'sftp', 'ssh', 'telnet']
	configuredIP = null
	dnsServer = null
	numReconnects = null
	signal = null				// only WiFi (dBm)
	speed = null				// null if unknown and 0 if no link
}

export class GCodeFileInfo {
	constructor(initData) {
		overloadPushMethod(this.thumbnails, value => new ThumbnailInfo(value));
		quickPatch(this, initData);
	}
	filament = []
	fileName = null
	generatedBy = null
	height = 0
	lastModified = null
	layerHeight = 0
	numLayers = 0
	printTime = null
	simulatedTime = null
	size = 0
	thumbnails = []
}

export class ThumbnailInfo {
	constructor(initData) { quickPatch(this, initData); }
	data = null
	height = 0
	offset = 0
	size = 0
	width = 0
}

export class Plugin extends PluginManifest {
	constructor(initData) { super(initData); }
	dsfFiles = []
	dwcFiles = []
	sdFiles = []
	pid = -1
}

export class Probe {
	constructor(initData) { quickPatch(this, initData); }
	calibrationTemperature = 25
	deployedByUser = false
	disablesHeaters = false
	diveHeight = 5
	maxProbeCount = 1
	offsets = [0, 0]
	recoveryTime = 0
	speed = 2
	temperatureCoefficient = 0
	threshold = 500
	tolerance = 0.03
	travelSpeed = 100
	triggerHeight = 0.7
	type = ProbeType.none
	value = [1000]
}

export class RestorePoint {
	constructor(initData) { quickPatch(this, initData); }
	coords = []
	extruderPos = 0
	fanPwm = 0
	feedRate = 50
	ioBits = 0
	laserPwm = null
	spindleSpeeds = []
	toolNumber = -1
}

export class Spindle {
	constructor(initData) { quickPatch(this, initData); }
	active = 0					// RPM
	configured = false
	current = 0					// RPM
	frequency = 0				// Hz
	min = 60					// RPM
	max = 10000					// RPM
	state = SpindleState.stopped
}

export class Tool {
	constructor(initData) { quickPatch(this, initData); }
	active = []
	axes = []					// may hold sub-arrays of drives per axis
	extruders = []
	fans = []
	feedForward = []
	filamentExtruder = -1
	heaters = []
	mix = []
	name = ''
	number = 0
	offsets = []				// offsets in the same order as the axes
	offsetsProbed = 0			// bitmap of the probed axes
	retraction = {
		extraRestart: 0,
		length: 0,
		speed: 0,
		unretractSpeed: 0,
		zHop: 0
	}
	spindle = -1
	spindleRpm = 0
	standby = []
	state = ToolState.off
}

export class UserSession {		// *** missing in RRF
	constructor(initData) { quickPatch(this, initData); }
	id = 0
	accessLevel = 'readOnly'
	origin = null
	originId = -1
	sessionType = 'local'
}

export class Volume {
	constructor(initData) { quickPatch(this, initData); }
	capacity = null				// in Bytes
	freeSpace = null			// in Bytes
	mounted = false
	name = null					// *** missing in RRF but reserved
	openFiles = null
	path = null
	speed = null				// in Bytes/s
}

function overloadPushMethod(array, presetFn) {
	const originalPushMethod = Object.getPrototypeOf(array).push;
	array.push = function(item) {
        originalPushMethod.call(array, (item !== null) ? Vue.observable(presetFn(item)) : null);
	};
}

export function overloadProperty(object, property, presetFn) {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(object, property);
    let storedValue = Vue.observable((propertyDescriptor.get !== undefined) ? propertyDescriptor.get() : propertyDescriptor.value);
    Object.defineProperty(object, property, {
        enumerable: true,
        get() { return storedValue; },
        set(value) {
            if (value !== storedValue) {
                storedValue = (value !== null) ? presetFn(value) : null;
            }
        }
    });
}

export function overloadModelPush(model) {
	overloadPushMethod(model.boards, value => new Board(value));
	overloadPushMethod(model.fans, value => new Fan(value));
	overloadPushMethod(model.heat.heaters, value => new Heater(value));
	overloadPushMethod(model.httpEndpoints, value => new HttpEndpoint(value));
	overloadPushMethod(model.inputs, value => new InputChannel(value));
	overloadPushMethod(model.job.layers, value => new Layer(value));
	overloadPushMethod(model.move.axes, value => new Axis(value));
	overloadPushMethod(model.move.extruders, value => new Extruder(value));
	overloadPushMethod(model.move.queue, value => new MoveQueueItem(value));
	overloadPushMethod(model.network.interfaces, value => new NetworkInterface(value));
	overloadPushMethod(model.sensors.analog, value => new AnalogSensor(value));
	overloadPushMethod(model.sensors.endstops, value => new Endstop(value));
	// Filament monitors need special treatment due to variable item types
	overloadPushMethod(model.sensors.gpIn, value => new GpInputPort(value));
	overloadPushMethod(model.sensors.probes, value => new Probe(value));
	overloadPushMethod(model.spindles, value => new Spindle(value));
	overloadPushMethod(model.state.gpOut, value => new GpOutputPort(value));
	overloadPushMethod(model.state.restorePoints, value => new RestorePoint(value));
	overloadPushMethod(model.tools, value => new Tool(value));
	overloadPushMethod(model.userSessions, value => new UserSession(value));
	overloadPushMethod(model.volumes, value => new Volume(value));
}

export function fixObjectModel(state, mergeData) {
	if (mergeData.sensors && mergeData.sensors.filamentMonitors) {
		// Recreate the filament monitor instances if their type has been changed
		mergeData.sensors.filamentMonitors.forEach(function(filamentMonitor, index) {
			const existingFilamentMonitor = state.sensors.filamentMonitors[index];
			if (filamentMonitor !== null && filamentMonitor.type && (existingFilamentMonitor === null || existingFilamentMonitor.type !== filamentMonitor.type)) {
				switch (filamentMonitor.type) {
					case FilamentMonitorType.laser:
                        Vue.set(state.sensors.filamentMonitors, index, new LaserFilamentMonitor(filamentMonitor));
						break;
					case FilamentMonitorType.pulsed:
                        Vue.set(state.sensors.filamentMonitors, index, new PulsedFilamentMonitor(filamentMonitor));
						break;
					case FilamentMonitorType.rotatingMagnet:
                        Vue.set(state.sensors.filamentMonitors, index, new RotatingMagnetFilamentMonitor(filamentMonitor));
						break;
					default:
                        Vue.set(state.sensors.filamentMonitors, index, new FilamentMonitor(filamentMonitor));
						break;
				}
			}
		});
	}
}