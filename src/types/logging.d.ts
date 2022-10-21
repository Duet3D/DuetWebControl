import Vue from 'vue';

declare module 'vue/types/vue' {
	interface Vue {
		$log(type: LogType, title: string, message: string | null = null, hostname = store.state.selectedMachine): void;
		$logCode(code: string | null, reply: string, hostname = store.state.selectedMachine): void;
		$logGlobal(type: MessageType, title: string, message: string): void;
	}
}
