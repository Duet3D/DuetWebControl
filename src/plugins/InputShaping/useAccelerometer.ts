import { OperationCancelledError } from "@duet3d/connectors";
import { type AccelerometerDataset, parseAccelerometerCsv } from "@duet3d/motionanalysis";
import type { Board } from "@duet3d/objectmodel";
import { computed, type Ref, watch } from "vue";

import { useMachineStore } from "@/stores/machine";
import Path from "@/utils/path";

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

	// Resolve when the board's accelerometer.runs counter advances - i.e. the firmware finished
	// writing the CSV. Polled rather than watched-on-the-board because the OM proxy doesn't expose
	// a path-based watch for nested fields without reactive scaffolding at the call site
	async function waitForAccelerometerRun(accelerometerId: string, cancelled: Ref<boolean>) {
		if (cancelled.value) {
			throw new OperationCancelledError();
		}

		const matches = /(\d+)(\.\d+)?/.exec(accelerometerId);
		if (!matches) {
			throw new Error("Failed to get accelerometer board ID");
		}
		const boardId = parseInt(matches[1]);
		const board = boards.value.find((b) => (!b.canAddress && !boardId) || b.canAddress === boardId);
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

	// Query the sampling rate of an accelerometer via M955, falls back to a generous default if the reply cannot be parsed
	async function getSamplingRate(accelerometerId: string): Promise<number> {
		try {
			const reply = await machineStore.sendCode(`M955 P${accelerometerId}`);
			const matches = /at (\d+)\s*Hz/.exec(typeof reply === "string" ? reply : "");
			if (matches) {
				return parseInt(matches[1]);
			}
		} catch (e) {
			console.warn(e);
		}
		return 2000;
	}

	return { boards, accelerometers, hasExternalAccelerometers, doCode, waitForAccelerometerRun, loadAccelerometerFile, getSamplingRate };
}
