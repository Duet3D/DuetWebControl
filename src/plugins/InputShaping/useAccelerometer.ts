import { OperationCancelledError } from "@duet3d/connectors";
import { type AccelerometerDataset, parseAccelerometerCsv } from "@duet3d/motionanalysis";
import { computed, type Ref, watch } from "vue";

import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

// Assumed for an accelerometer the firmware has not reported a rate for. Erring low only shortens that
// recording, whereas erring high stretches the collection and can starve an expansion board's main task
const defaultSamplingRate = 1000;

/**
 * Selectable accelerometer, i.e. a configured entry of sensors.accelerometers
 */
export interface AccelerometerOption {
	/**
	 * Index in sensors.accelerometers, which is the M955/M956 P number
	 */
	index: number;

	/**
	 * CAN address of the board the accelerometer is connected to, taken from the port prefix
	 */
	board: number;

	/**
	 * Label for selection lists
	 */
	title: string;
}

/**
 * Shared accelerometer helpers for the recording dialogs and file lists
 */
export function useAccelerometer() {
	const machineStore = useMachineStore();

	const accelerometers = computed<Array<AccelerometerOption>>(() => {
		const options: Array<AccelerometerOption> = [];
		machineStore.model.sensors.accelerometers.forEach((accelerometer, index) => {
			if (accelerometer !== null) {
				options.push({ index, board: parseInt(/^[!^*]*(\d+)\./.exec(accelerometer.port)?.[1] ?? "0"), title: `${index} (${accelerometer.port})` });
			}
		});
		return options;
	});
	const hasExternalAccelerometers = computed(() => accelerometers.value.some((accelerometer) => accelerometer.board !== (machineStore.model.boards[0]?.canAddress ?? 0)));

	function getAccelerometerTitle(index: number | null): string {
		return accelerometers.value.find((accelerometer) => accelerometer.index === index)?.title ?? "";
	}

	async function doCode(code: string) {
		const reply = await machineStore.sendCode(code);
		if (typeof reply === "string" && reply.indexOf("Error") === 0) {
			throw new Error(`Code ${code} failed: ${reply}`);
		}
	}

	// Resolve when the runs counter of the given accelerometer advances, i.e. the firmware finished writing the CSV
	async function waitForAccelerometerRun(index: number, cancelled: Ref<boolean>) {
		if (cancelled.value) {
			throw new OperationCancelledError();
		}

		return new Promise<void>((resolve, reject) => {
			const stop = watch(() => machineStore.model.sensors.accelerometers[index]?.runs ?? 0, () => {
				if (cancelled.value) {
					reject(new OperationCancelledError());
				} else {
					resolve();
				}
				stop();
			});
		});
	}

	// In SBC mode the run counter advances as soon as the close request has been sent, so a freshly written file may still lack its trailer for a moment
	async function loadAccelerometerFile(filename: string, retries: number = 0): Promise<AccelerometerDataset> {
		for (let attempt = 0; ; attempt++) {
			const csvFile = await machineStore.download({
				filename: Path.combine(Path.accelerometer, filename),
				type: "text"
			}, false, false, false);
			try {
				return parseAccelerometerCsv(csvFile as string);
			} catch (e) {
				if (attempt >= retries) {
					throw e;
				}
				await new Promise((resolve) => setTimeout(resolve, 250));
			}
		}
	}

	// Stays 0 on expansion boards whose firmware does not report the settled rate to M955
	function getSamplingRate(index: number): number {
		return machineStore.model.sensors.accelerometers[index]?.samplingRate ?? 0;
	}

	// Rate to size a collection for, which must not exceed the real one or the recording is cut short
	function getCollectionRate(index: number): number {
		return getSamplingRate(index) || defaultSamplingRate;
	}

	return { accelerometers, hasExternalAccelerometers, getAccelerometerTitle, doCode, waitForAccelerometerRun, loadAccelerometerFile, getSamplingRate, getCollectionRate };
}
