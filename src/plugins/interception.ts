import type ObjectModel from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";

// #region Object model patches

/**
 * Callback augmenting an incoming object model update before it is merged into the typed model.
 * @param payload Update payload, modified in place
 * @param model Typed object model as it still is, before the payload is applied
 */
export type ModelPatch = (payload: any, model: ObjectModel) => void;

const _modelPatches = new Map<string, ModelPatch>();

/**
 * Register a callback that augments every incoming object model update.
 *
 * The callback runs on each update payload before it is merged, including the full model that
 * arrives on (re)connect - which is what makes injected data survive a reconnect without any
 * further bookkeeping. Keep it cheap: it runs at the connector's poll rate.
 *
 * Data that arrives on the plugin's own schedule (say, a temperature polled from an external
 * controller) is better pushed in with {@link patchModel} than kept in a closure.
 * @param id Unique identifier, conventionally the plugin id
 * @param patch Callback to register
 */
export function registerModelPatch(id: string, patch: ModelPatch) {
	_modelPatches.set(id, patch);
}

/**
 * Remove a model patch again
 * @param id Identifier it was registered with
 */
export function unregisterModelPatch(id: string) {
	_modelPatches.delete(id);
}

/**
 * Merge an update payload into the object model as if it had come from the machine, for data a
 * plugin obtains by itself. The registered model patches run on it like on any other update
 * @param payload Update payload in object model shape
 */
export function patchModel(payload: any) {
	useMachineStore().updateModel(payload);
}

/**
 * Run every registered patch over an incoming update payload.
 * A throwing patch is reported and skipped - object model updates must keep flowing
 * @param payload Update payload, modified in place
 * @param model Typed object model as it still is, before the payload is applied
 */
export function applyModelPatches(payload: any, model: ObjectModel) {
	for (const [id, patch] of _modelPatches) {
		try {
			patch(payload, model);
		} catch (e) {
			console.warn(`Model patch "${id}" failed`, e);
		}
	}
}

// #endregion

// #region Code interception

/**
 * What an interceptor decides about a code:
 * - `{ code }` sends that code instead of the original one
 * - `{ reply }` keeps the code from being sent at all and returns the reply to the caller
 * - nothing at all lets the code pass unchanged
 */
export type CodeInterceptionResult = { code: string } | { reply: string } | undefined;

/**
 * Callback inspecting a code on its way out of DWC
 * @param code Code about to be sent, as rewritten by the interceptors registered before this one
 */
export type CodeInterceptor = (code: string) => CodeInterceptionResult | Promise<CodeInterceptionResult>;

const _codeInterceptors = new Map<string, CodeInterceptor>();

/**
 * Register a callback that may rewrite or handle codes sent by DWC.
 *
 * Interceptors run in registration order: a rewritten code is passed on to the remaining
 * interceptors, and the first one answering with a reply ends the chain. Only codes issued by
 * DWC itself pass through - codes from a job file, a macro, a trigger or PanelDue are executed
 * by the firmware and never reach the browser
 * @param id Unique identifier, conventionally the plugin id
 * @param interceptor Callback to register
 */
export function registerCodeInterceptor(id: string, interceptor: CodeInterceptor) {
	_codeInterceptors.set(id, interceptor);
}

/**
 * Remove a code interceptor again
 * @param id Identifier it was registered with
 */
export function unregisterCodeInterceptor(id: string) {
	_codeInterceptors.delete(id);
}

/**
 * Run a code past every registered interceptor.
 * A throwing interceptor is reported and skipped, so a broken plugin cannot make the machine
 * uncontrollable
 * @param code Code about to be sent
 * @returns Reply to answer with, the code to send instead, or undefined to send the original one
 */
export async function interceptCode(code: string): Promise<CodeInterceptionResult> {
	let effectiveCode = code;
	for (const [id, interceptor] of _codeInterceptors) {
		let result;
		try {
			result = await interceptor(effectiveCode);
		} catch (e) {
			console.warn(`Code interceptor "${id}" failed`, e);
			continue;
		}

		if (result !== undefined) {
			if ("reply" in result) {
				return result;
			}
			effectiveCode = result.code;
		}
	}
	return (effectiveCode === code) ? undefined : { code: effectiveCode };
}

// #endregion
