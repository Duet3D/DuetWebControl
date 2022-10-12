import { Module } from "vuex";
import { InternalRootState, RootState } from ".";

interface ContextMenuItem {
	/**
	 * Type of this context menu item
	 */
	contextMenuType: "jobFileList";

	/**
	 * Icon of the menu item
	 */
	icon: string;

	/**
	 * Optional function returning the menu item caption.
	 * If this function is preset, caption is ignored
	 */
	name: string | (() => string);

	/**
	 * Optional path for this menu item
	 */
	path?: string;

	/**
	 * Function to call when the item is triggered
	 */
	action: string;
}

export interface UiInjectionState {
	/**
	 * List of registered context menu items
	 */
	contextMenuItems: {
		/**
		 * Context menu items for the job file list
		 */
		jobFileList: Array<ContextMenuItem>;
	};

	/**
	 * List of components to render on the main app component
	 */
	injectedComponents: Array<string>;
}

export default {
	namespaced: true,
	state: {
		contextMenuItems: {
			jobFileList: []
		},
		injectedComponents: []
	},
	mutations : {
		registerPluginContextMenuItem(state, payload: ContextMenuItem) {
			if (payload.contextMenuType !== "jobFileList") {
				throw Error("invalid menu name");
			}

			if (payload.name instanceof Function) {
				const captionFn = payload.name;
				Object.defineProperty(payload, "name", {
					get: captionFn
				});
			}
			state.contextMenuItems[payload.contextMenuType].push(payload);
		},
		injectComponent(state, payload) {
			state.injectedComponents.push(payload);
		}
	}
} as Module<UiInjectionState, InternalRootState>

