declare module 'vue/types/vue' {
  interface Vue {
    $log(type: MessageType, title: string, message: string, hostname = store.state.selectedMachine): void;
    $logCode(code: string | null, reply: string, hostname = store.state.selectedMachine): void;
    $logGlobal(type: MessageType, title: string, message: string): void;
  }
}
