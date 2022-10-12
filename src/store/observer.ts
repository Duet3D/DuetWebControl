import { Store } from "vuex";

import { InternalRootState, RootState } from "@/store";

import { defaultMachine } from "./machine";

let settingsTimer: NodeJS.Timeout | null = null;
const machineSettingsTimer: Record<string, NodeJS.Timeout> = {}, machineCacheTimer: Record<string, NodeJS.Timeout> = {};

/**
 * Reset the cache save timer for a given machine
 * @param machine Machine to reset the timer for
 */
export function resetCacheTimer(machine: string) {
	if (machineCacheTimer[machine]) {
		clearTimeout(machineCacheTimer[machine]);
		delete machineCacheTimer[machine];
	}
}

/**
 * Reset the global or machine-spefic settings save timer
 * @param machine Optional machine to reset the timer for
 */
export function resetSettingsTimer(machine?: string) {
	if (!machine) {
		if (settingsTimer) {
			clearTimeout(settingsTimer);
			settingsTimer = null;
		}
	} else if (machineSettingsTimer[machine]) {
		clearTimeout(machineSettingsTimer[machine]);
		delete machineSettingsTimer[machine];
	}
}

/**
 * Plugin functionality to auto-save the cache and settings on demand
 * @param store Vuex store instance`
 */
export default function(store: Store<InternalRootState>) {
	// Observe the mutations of the store and make sure the cache and
	// settings are saved automatically after a certain debounce delay
	store.subscribe((mutation, internalState) => {
		const state = internalState as RootState;

		if (!mutation.type.endsWith("/load") && !mutation.type.endsWith("/setLastHostname")) {
			const machineMatches = /^machines\/(.+)\//.exec(mutation.type);
			const machine = machineMatches ? machineMatches[1] : state.selectedMachine;
			if (machine === defaultMachine) {
				return;
			}

			if (mutation.type.startsWith("settings")) {
				// Global settings have changed
				if (settingsTimer) {
					clearTimeout(settingsTimer);
				}

				settingsTimer = setTimeout(function() {
					settingsTimer = null;
					store.dispatch("settings/save");
				}, state.settings.settingsSaveDelay);
			} else if (mutation.type.indexOf("/settings/") !== -1) {
				// Machine settings have changed
				if (machineSettingsTimer[machine]) {
					clearTimeout(machineSettingsTimer[machine]);
				}

				machineSettingsTimer[machine] = setTimeout(function() {
					delete machineSettingsTimer[machine];
					if (state.machines[machine] !== undefined) {
						store.dispatch(`machines/${machine}/settings/save`);
					}
				}, state.settings.settingsSaveDelay);
			} else if (mutation.type.indexOf("/cache/") !== -1) {
				// Machine cache has changed
				if (machineCacheTimer[machine]) {
					clearTimeout(machineCacheTimer[machine]);
				}

				machineCacheTimer[machine] = setTimeout(function() {
					delete machineCacheTimer[machine];
					if (state.machines[machine] !== undefined) {
						store.dispatch(`machines/${machine}/cache/save`);
					}
				}, state.settings.cacheSaveDelay);
			}
		}
	});
}
