import { OperationCancelledError } from "@duet3d/connectors";
import { type AccelerometerDataset, parseAccelerometerCsv } from "@duet3d/motionanalysis";
import type { Board } from "@duet3d/objectmodel";
import { computed, type Ref, watch } from "vue";

import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

// Assumed for an accelerometer the firmware has not reported a rate for. Erring low only shortens that
// recording, whereas erring high stretches the collection and can starve an expansion board's main task
const defaultSamplingRate = 1000;

/**
 * Shared accelerometer helpers for the recording dialogs and file lists
 */
export function useAccelerometer() {
	const machineStore = useMachineStore();

	const boards = computed<Array<Board>>(() => machineStore.model.boards.filter((b): b is Board => b !== null));
	const accelerometers = computed<Array<string>>(() => boards.value
		.filter((b) => b.accelerometer !== null)
		.map((b) => (b.canAddress ? `${b.canAddress}.0` : "0")));
	const hasExternalAccelerometers = computed(() => boards.value.some((b) => b.canAddress !== 0 && !!b.accelerometer));

	async function doCode(code: string) {
		const reply = await machineStore.sendCode(code);
		if (typeof reply === "string" && reply.indexOf("Error") === 0) {
			throw new Error(`Code ${code} failed: ${reply}`);
		}
	}

	function getAccelerometerBoard(accelerometerId: string): Board | undefined {
		const matches = /(\d+)(\.\d+)?/.exec(accelerometerId);
		if (!matches) {
			return undefined;
		}
		const boardId = parseInt(matches[1]);
		return boards.value.find((b) => (!b.canAddress && !boardId) || b.canAddress === boardId);
	}

	// Resolve when the board's accelerometer.runs counter advances - i.e. the firmware finished
	// writing the CSV. Polled rather than watched-on-the-board because the OM proxy doesn't expose
	// a path-based watch for nested fields without reactive scaffolding at the call site
	async function waitForAccelerometerRun(accelerometerId: string, cancelled: Ref<boolean>) {
		if (cancelled.value) {
			throw new OperationCancelledError();
		}

		const board = getAccelerometerBoard(accelerometerId);
		if (!board) {
			throw new Error("Failed to get accelerometer board");
		}

		return new Promise<void>((resolve, reject) => {
			const stop = watch(() => board.accelerometer?.runs ?? 0, () => {
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
				type: "text",
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

	// Stays 0 on firmware that does not report it and on remote boards that M955 has not touched since they started
	function getSamplingRate(accelerometerId: string): number {
		return getAccelerometerBoard(accelerometerId)?.accelerometer?.samplingRate ?? 0;
	}

	// Rate to size a collection for, which must not exceed the real one or the recording is cut short
	function getCollectionRate(accelerometerId: string): number {
		return getSamplingRate(accelerometerId) || defaultSamplingRate;
	}

	return { boards, accelerometers, hasExternalAccelerometers, doCode, waitForAccelerometerRun, loadAccelerometerFile, getSamplingRate, getCollectionRate };
}
