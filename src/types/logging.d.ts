import Vue from "vue";

declare module "vue/types/vue" {
	interface Vue {
		/**
		 * Log an arbitrary machine-related message
		 * @param type Message type
		 * @param title Title of the message
		 * @param message Actual message
		 * @param hostname Hostname to log this message to
		 */
		$log(type: LogType, title: string, message: string | null = null, hostname = store.state.selectedMachine): void;

		/**
		 * Log a code reply from a given machine
		 * @param code G/M/T-code
		 * @param reply Code reply
		 * @param hostname Hostname of the machine that produced the reply
		 */
		$logCode(code: string | null, reply: string, hostname = store.state.selectedMachine): void;

		/**
		 * Log a global message that is logged by all connected machines
		 * @param type Message type
		 * @param title Message title
		 * @param message Message content
		 */
		$logGlobal(type: MessageType, title: string, message: string): void;
	}
}
