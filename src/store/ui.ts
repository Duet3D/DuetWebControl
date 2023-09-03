import { defineStore } from "pinia";
import { Component } from "vue";
import { useMachineStore } from "./machine";

/**
 * Types of supported context menus
 */
export enum ContextMenuType {
	JobFileList = "jobFileList"
}

/**
 * Context menu item
 */
export interface ContextMenuItem {
	/**
	 * Target of this context menu item
	 */
	contextMenuType: ContextMenuType,

	/**
	 * Icon of this menu item
	 */
	icon: string;

	/**
	 * Caption of this menu item
	 */
	name: string | (() => string);

	/**
	 * Optional path for this menu item
	 */
	path?: string;

	/**
	 * Global event to trigger on click
	 */
	action: string;
}

/**
 * Injected component
 */
export interface InjectedComponent {
	/**
	 * Name of the injected component
	 */
	name: string;

	/**
	 * Component definition
	 */
	component: Component;
}

export const useUiStore = defineStore("ui", {
	state: () => ({
		/**
		 * Amount of bottom margin to add (used for absolute overlays like the OSK)
		 */
		bottomMargin: 0,

		/**
		 * Defines if the connect dialog is shown
		 */
		connectDialogShown: process.env.NODE_ENV === "development",

		/**
		 * Additional context menu items
		 */
		contextMenuItems: {
			/**
			 * Extra context menu items for the job file list
			 */
			jobFileList: [] as Array<ContextMenuItem>
		},

		/**
		 * Whether messages are supposed to be hidden (when the Console is open)
		 */
		hideCodeReplyNotifications: false,

		/**
		 * Injected components to render in the App component
		 */
		injectedComponents: [] as Array<Component>,

		/**
		 * Defines if the OSK functionality is enabled
		 */
		oskEnabled: false
	}),
	getters: {
		/**
		 * Indicates if the UI is supposed to be frozen
		 * @param state Store state
		 * @returns True if the UI is supposed to be frozen
		 */
		frozen: () => {
			const machineStore = useMachineStore();
			return machineStore.isConnecting || machineStore.isDisconnecting || !machineStore.isConnected
		},

		/**
		 * Indicates if there are any sensor values that can be displayed
		 */
		hasTemperaturesToDisplay: () => {
			const machineStore = useMachineStore();
			machineStore.model.sensors.analog.some((sensor, sensorIndex) => {
				return (machineStore.model.heat.heaters.some(heater => heater && heater.sensor === sensorIndex) ||
						machineStore.settings.displayedExtraTemperatures.indexOf(sensorIndex) !== -1)
			});
		}
	},
	actions: {
		/**
		 * Register a new context menu item
		 * @param item Context menu item to register
		 */
		registerContextMenuItem(item: ContextMenuItem) {
			if (item.contextMenuType !== "jobFileList") {
				throw Error("invalid menu name");
			}

			if (item.name instanceof Function) {
				Object.defineProperty(item, "name", {
					get: item.name
				});
			}
			this.contextMenuItems[item.contextMenuType].push(item);
		},

		/**
		 * Inject a component in the App component
		 * @param component Component to inject
		 */
		injectComponent(component: InjectedComponent) {
			this.injectedComponents.push(component);
		}
	}
});

