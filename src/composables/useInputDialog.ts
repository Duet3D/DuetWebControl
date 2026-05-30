import { reactive } from "vue";

export interface InputRequest {
	id: number;
	title: string;
	prompt: string;
	preset?: string | number;
	isNumeric: boolean;
	// For numeric input these bound the value; for string input they bound the length
	min?: number;
	max?: number;
	resolve: (value: string | number | null) => void;
}

let counter = 0;
const queue = reactive<Array<InputRequest>>([]);

/**
 * Queue a text-input dialog and resolve to the entered string, or null if the user cancelled.
 * Concurrent calls are queued and shown one after another, each resolving its own promise
 * @param title Already-translated dialog title
 * @param prompt Already-translated dialog body
 * @param preset Optional value the field starts with
 * @param minLength Optional minimum number of characters the input must have
 * @param maxLength Optional maximum number of characters the input may have
 */
export function getStringInput(title: string, prompt: string, preset?: string, minLength?: number, maxLength?: number): Promise<string | null> {
	return new Promise<string | null>((resolve) => {
		queue.push({ id: ++counter, title, prompt, preset, isNumeric: false, min: minLength, max: maxLength, resolve: (value) => resolve(value as string | null) });
	});
}

/**
 * Queue a numeric-input dialog and resolve to the entered number, or null if the user cancelled.
 * The returned value is guaranteed to satisfy min/max; concurrent calls are queued and shown
 * one after another, each resolving its own promise
 * @param title Already-translated dialog title
 * @param prompt Already-translated dialog body
 * @param preset Optional value the field starts with
 * @param min Optional inclusive lower bound for the value
 * @param max Optional inclusive upper bound for the value
 */
export function getNumericInput(title: string, prompt: string, preset?: number, min?: number, max?: number): Promise<number | null> {
	return new Promise<number | null>((resolve) => {
		queue.push({ id: ++counter, title, prompt, preset, isNumeric: true, min, max, resolve: (value) => resolve(value as number | null) });
	});
}

/**
 * Reactive queue of pending input requests, consumed by InputDialogQueue
 */
export function useInputQueue(): Array<InputRequest> {
	return queue;
}
