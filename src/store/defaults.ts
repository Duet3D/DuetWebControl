import ObjectModel, { Axis, AxisLetter, Board, Extruder, Fan, Heat, Heater, initCollection, initObject, MachineStatus, Move, Network, Probe, Sensors, State, Tool } from "@duet3d/objectmodel";
import packageInfo from "../../package.json";

/**
 * Default username for connection attempts
 */
export const DefaultUsername = "";

/**
 * Default password for connection attempts
 */
export const DefaultPassword = "reprap";

/**
 * Default object model used to display initial values.
 * This does not need to be reactive because it is not expected to change
 */
export const DefaultObjectModel = initObject(ObjectModel, {
	boards: initCollection(Board, [
		{}
	]),
	fans: initCollection(Fan, [
		{}
	]),
	heat: initObject(Heat, {
		bedHeaters: [
			0
		],
		heaters: initCollection(Heater, [
			{},
			{}
		])
	}),
	move: initObject(Move, {
		axes: initCollection(Axis, [
			{
				letter: AxisLetter.X,
				homed: true,
				machinePosition: 0,
				userPosition: 0
			},
			{
				letter: AxisLetter.Y,
				homed: true,
				machinePosition: 0,
				userPosition: 0
			},
			{
				letter: AxisLetter.Z,
				homed: true,
				machinePosition: 0,
				userPosition: 0
			}
		]),
		extruders: initCollection(Extruder, [
			{}
		])
	}),
	network: initObject(Network, {
		hostname: (process.env.NODE_ENV === "production") ? location.hostname : undefined,
		name: (process.env.NODE_ENV === "production") ? `(${location.hostname})` : packageInfo.prettyName
	}),
	sensors: initObject(Sensors, {
		probes: initCollection(Probe, [
			{}
		])
	}),
	state: initObject(State, {
		status: MachineStatus.disconnected
	}),
	tools: initCollection(Tool, [
		{
			number: 0,
			active: [0],
			standby: [0],
			heaters: [1],
			extruders: [0],
			spindle: -1,
			spindleRpm: 0
		}
	])
});

/**
 * Default general settings defined by third-party plugins
 */
export const DefaultPluginSettings: Record<string, any> = {};
