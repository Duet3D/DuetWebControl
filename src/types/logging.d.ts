import Vue from "vue";

import { LogMessageType } from "@/utils/logging";

declare module "vue" {
	interface ComponentCustomProperties  {
		/**
		 * Log an arbitrary machine-related message
		 * @param type Message type
		 * @param title Title of the message
		 * @param message Actual message
		 */
		$log(type: LogMessageType, title: string, message: string | null = null): void;

		/**
		 * Log an arbitrary machine-related message to the console only
		 * @param type Message type
		 * @param title Title of the message
		 * @param message Actual message
		 */
		$logToConsole(type: LogMessageType, title: string, message: string | null = null);

		/**
		 * Log a code reply from a given machine
		 * @param code G/M/T-code
		 * @param reply Code reply
		 */
		$logCode(code: string | null, reply: string): void;
	}
}
