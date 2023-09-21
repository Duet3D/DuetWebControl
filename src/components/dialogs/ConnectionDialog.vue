<template>
	<v-dialog :value="shown" :persistent="isPersistent" width="480">
		<v-card color="primary" dark>
			<v-card-title class="subtitle-1">
				{{ message }}
			</v-card-title>

			<v-card-text>
				<v-progress-linear :indeterminate="connectingProgress < 0" :value="connectingProgress" color="white"
								   class="mb-0" />

				<div v-if="displayReset && isConnected" class="d-flex">
					<code-btn class="mx-auto mt-5" code="M999" :log="false"
							  color="warning" :title="$t('button.reset.title')">
						<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t("button.reset.caption") }}
					</code-btn>
				</div>

				<div v-else-if="isUpdating && boardsBeingUpdated.length > 0" class="d-flex flex-column mt-3">
					<span class="mb-1">
						{{ $t("dialog.connection.boardUpdateMessage", boardsBeingUpdated.length) }}
					</span>
					<span v-for="canAddress in boardsBeingUpdated.filter(item => item > 0)" :key="canAddress" class="ms-3">
						<v-icon small class="mr-1" v-text="getBoardIcon(canAddress)" />
						{{ getBoardName(canAddress) }}
					</span>
					<span v-if="boardsBeingUpdated.includes(0)" class="ms-3">
						<v-icon small class="mr-1" v-text="getBoardIcon(0)" />
						{{ getBoardName(0) }}
					</span>
				</div>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { MachineStatus } from "@duet3d/objectmodel";
import { mapState } from "pinia";
import { defineComponent } from "vue";

import { useMachineStore } from "@/store/machine";

export default defineComponent({
	computed: {
		...mapState(useMachineStore, {
			boardBeingUpdated: state => state.boardBeingUpdated,
			boardsBeingUpdated: state => state.boardsBeingUpdated,
			connectingProgress: state => state.connectingProgress,
			isConnected: state => state.isConnected,
			status: state => state.model.state.status,
			isUpdating: state => state.model.state.status === MachineStatus.updating
		}),
		isPersistent(): boolean {
			if (!(this.displayReset && this.isConnected)) {
				// If the connection is gone, allow this dialog only to be dismissed if running as PWA
				return !window.matchMedia("(display-mode: standalone)").matches;
			}
			return false;
		},
		message(): string {
			const machineStore = useMachineStore();
			if (machineStore.isConnecting || this.connectingProgress >= 0) {
				return this.$t("dialog.connection.connecting");
			}
			if (this.isUpdating) {
				return this.$t("dialog.connection.updating");
			}
			if (machineStore.isReconnecting) {
				return this.$t("dialog.connection.reconnecting");
			}
			if (machineStore.isDisconnecting) {
				return this.$t("dialog.connection.disconnecting");
			}
			return this.$t("dialog.connection.standBy");
		},
		shown(): boolean {
			const machineStore = useMachineStore();
			return (machineStore.isConnecting || this.connectingProgress >= 0 || machineStore.isReconnecting || machineStore.isDisconnecting ||
				machineStore.model.state.status === MachineStatus.halted || machineStore.model.state.status === MachineStatus.updating);
		}
	},
	data() {
		return {
			displayReset: false,
			haltedTimer: null as NodeJS.Timeout | null,
			updatedBoards: new Array<number>(),
		}
	},
	methods: {
		getBoardIcon(canAddress: number) {
			if (this.boardBeingUpdated == canAddress) {
				return "mdi-arrow-right-bold";
			}
			return this.updatedBoards.includes(canAddress) ? "mdi-check" : "mdi-asterisk";
		},
		getBoardName(canAddress: number) {
			const machineStore = useMachineStore();
			const board = machineStore.model.boards.find(board => board.canAddress === canAddress);
			if (board) {
				return canAddress ? `${board.name ?? "Expansion Board"} (#${canAddress})` : board.name;
			}
			return canAddress ? `Board #${canAddress}` : "Mainboard";
		},
		showResetButton() {
			this.haltedTimer = null;
			this.displayReset = true;
		}
	},
	watch: {
		boardsBeingUpdated() {
			this.updatedBoards.splice(0);
		},
		boardBeingUpdated(to: number, from: number) {
			if (from >= 0) {
				this.updatedBoards.push(from);
			}
		},
		status(to: MachineStatus) {
			if (to === MachineStatus.halted) {
				this.haltedTimer = setTimeout(this.showResetButton.bind(this), 4000);
			} else {
				if (this.haltedTimer) {
					clearTimeout(this.haltedTimer);
					this.haltedTimer = null;
				}
				this.displayReset = false;
			}
		}
	}
});
</script>
