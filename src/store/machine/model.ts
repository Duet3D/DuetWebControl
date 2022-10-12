import ObjectModel, { Axis, AxisLetter, Board, Extruder, Fan, Heat, Heater, initCollection, initObject, MachineStatus, Move, Network, Probe, Sensors, State, Tool } from "@duet3d/objectmodel";
import Vue from "vue";
import type { Module } from "vuex";

import { isPrinting } from "@/utils/enums";

import { RootState } from "..";
import BaseConnector from "./connector/BaseConnector";
import patch from "@/utils/patch";

/**
 * Default object model used to display initial values.
 * This does not need to be reactive because it is not expected to change
 */
export const DefaultModel = initObject(ObjectModel, {
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
		name: 'Duet Web Control'
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
 * Type of a Vuex machine model module
 */
export type MachineModel = Module<ObjectModel, RootState>;

const secondState = new ObjectModel();

/**
 * Generate a Vuex machine model module from a connector instance.
 * If no connector is passed, the default object model is returned 
 * @param connector Connector used by the machine module instance
 * @returns Machine model module
 */
export default function(connector: BaseConnector | null) : MachineModel {
	// If a connector is given, just update the hostname and name
	const typedState = !connector ? DefaultModel : new ObjectModel();
	const state = Vue.observable(!connector ? DefaultModel : new ObjectModel());
	if (connector !== null) {
		typedState.network.hostname = state.network.hostname = connector.hostname;
		typedState.network.name = state.network.name = `(${connector.hostname})`;
	}

	// Generate the Vuex module
	return {
		namespaced: true,
		state,
		getters: {
			currentTool(state) {
				if (state.state.currentTool >= 0) {
					return state.tools[state.state.currentTool];
				}
				return null;
			},
			fractionPrinted(state) {
				if (state.job.file && state.job.filePosition !== null && state.job.file.size > 0) {
					return (state.job.filePosition as number) / (state.job.file.size as number);
				}
				return 0;
			},
			maxHeaterTemperature(state) {
				let maxTemp: number | null = null;
				for (const heater of state.heat.heaters) {
					if (heater !== null && (maxTemp === null || heater.max > maxTemp)) {
						maxTemp = heater.max;
					}
				}
				return maxTemp;
			},
			jobProgress(state, getters) {
				if (isPrinting(state.state.status)) {
					if (state.state.status !== MachineStatus.simulating && state.job.file !== null && state.move.extruders.length > 0) {
						// Get the total amount of filament extruded (according to the slicer)
						let totalRawExtruded = 0;
						for (const extruder of state.move.extruders) {
							totalRawExtruded += extruder.rawPosition;
						}

						// Compute the progress according to the filamet usage
						const totalFilamentRequired = state.job.file.filament.reduce((a, b) => a + b);
						if (totalFilamentRequired > 0) {
							// Limit the maximum in case the user put extra extrusions in the start/end G-code
							return Math.min(totalRawExtruded / totalFilamentRequired, 1);
						}
					}
					return getters.fractionPrinted;
				}
				return state.job.lastFileName ? 1 : 0;
			}
		},
		mutations: {
			update(state, data) {
				typedState.update(data);

				// FIXME This solution isn't great but Vue.observable messes up our fully-typed ObjectModel class too much...
				// It may be necessary to upgrade to Vue 3 sooner than expected, because it does not suffer from the same limitations as Vue 2
				for (const key in data) {
					if (key === "plugins") {
						state.plugins.update(typedState.plugins);
					} else {
						patch((state as any)[key], (typedState as any)[key]);
					}
				}
			} 
		}
	};
}
