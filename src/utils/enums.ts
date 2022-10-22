import { MachineStatus } from "@duet3d/objectmodel";

/**
 * Check if the machine is in a pause-related state
 * @param status Machine status
 * @returns If the machine is paused
 */
export function isPaused(status: MachineStatus) {
	return (status === MachineStatus.pausing ||
			status === MachineStatus.paused ||
			status === MachineStatus.cancelling ||
			status === MachineStatus.resuming);
}

/**
 * Check if the machine is in a print-related state
 * @param status Machine status
 * @returns If the machine is printing
 */
export function isPrinting(status: MachineStatus) {
	return (status === MachineStatus.pausing ||
			status === MachineStatus.paused ||
			status === MachineStatus.cancelling ||
			status === MachineStatus.resuming ||
			status === MachineStatus.processing ||
			status === MachineStatus.simulating);
}
