import { reactive } from "vue";

export interface ConfirmRequest {
	id: number;
	title: string;
	prompt: string;
	icon?: string;
	resolve: (confirmed: boolean) => void;
}

let counter = 0;
const queue = reactive<Array<ConfirmRequest>>([]);

/**
 * Queue a yes/no confirmation dialog and resolve to the user's choice. Concurrent calls are queued
 * and shown one after another, each resolving its own promise, so parallel confirmations never race
 * @param title Already-translated dialog title
 * @param prompt Already-translated dialog body
 * @param icon Optional MDI icon shown next to the title
 * @returns True if the user confirmed, false if they declined
 */
export function showConfirmDialog(title: string, prompt: string, icon?: string): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		queue.push({ id: ++counter, title, prompt, icon, resolve });
	});
}

/**
 * Reactive queue of pending confirmation requests, consumed by ConfirmDialogQueue
 */
export function useConfirmQueue(): Array<ConfirmRequest> {
	return queue;
}
