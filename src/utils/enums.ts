import { MachineStatus } from "@duet3d/objectmodel";

export function isPaused(status: MachineStatus) {
	return (status === MachineStatus.pausing ||
			status === MachineStatus.paused ||
			status === MachineStatus.cancelling ||
			status === MachineStatus.resuming);
}

export function isPrinting(status: MachineStatus) {
	return (status === MachineStatus.pausing ||
			status === MachineStatus.paused ||
			status === MachineStatus.cancelling ||
			status === MachineStatus.resuming ||
			status === MachineStatus.processing ||
			status === MachineStatus.simulating);
}
