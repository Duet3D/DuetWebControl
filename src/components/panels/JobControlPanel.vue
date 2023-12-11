<template>
	<v-card>
		<v-card-title class="pb-1">
			<v-icon small class="mr-1">mdi-wrench</v-icon>
			{{ $t("panel.jobControl.caption") }}
		</v-card-title>

		<v-card-text class="pt-0">
			<code-btn color="warning" block :disabled="uiFrozen || !isPrinting || isPausing || isCancelling"
					  :code="isPaused ? 'M24' : 'M25'" tabindex="0">
				<v-icon class="mr-1">{{ isPaused ? 'mdi-play' : 'mdi-pause' }}</v-icon>
				{{ pauseResumeText }}
			</code-btn>

			<code-btn v-if="isPaused" block :disabled="isCancelling" class="mt-3" color="error" code="M0">
				<v-icon class="mr-1">mdi-stop</v-icon>
				{{ cancelText }}
			</code-btn>

			<code-btn v-if="!isPrinting && processAnotherCode" block class="mt-3" color="success" :code="processAnotherCode">
				<v-icon class="mr-1">{{ processAnotherIcon }}</v-icon>
				{{ processAnotherText }}
			</code-btn>

			<v-menu v-if="thumbnails.some(thumbnail => thumbnail.data !== null)" open-on-click offset-y>
				<template #activator="{ attrs, on }">
					<v-btn color="info" block :disabled="uiFrozen" class="mt-3" v-bind="attrs" v-on="on">
						<v-icon class="mr-1">mdi-image</v-icon>
						{{ $t("panel.jobControl.showPreview" )}}
					</v-btn>
				</template>

				<v-card>
					<v-carousel height="auto" hide-delimiters :show-arrows="validThumbnails.length > 1"
								show-arrows-on-hover>
						<v-carousel-item v-for="thumbnail in validThumbnails"
										 :key="`${thumbnail.format}-${thumbnail.width}x${thumbnail.height}`">
							<div class="d-flex fill-height align-center">
								<thumbnail-img :thumbnail="thumbnail" class="mx-auto" />
							</div>
						</v-carousel-item>
					</v-carousel>
				</v-card>
			</v-menu>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { MachineMode, MachineStatus, ThumbnailInfo } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";
import { isPaused, isPrinting } from "@/utils/enums";
import { escapeFilename } from "@/utils/path";

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		isPausing(): boolean { return store.state.machine.model.state.status === MachineStatus.pausing; },
		isPaused(): boolean { return isPaused(store.state.machine.model.state.status); },
		isCancelling(): boolean { return store.state.machine.model.state.status === MachineStatus.cancelling; },
		isPrinting(): boolean { return isPrinting(store.state.machine.model.state.status); },
		pauseResumeText(): string {
			if (this.isSimulating) {
				return this.$t(this.isPaused ? "panel.jobControl.resumeSimulation" : "panel.jobControl.pauseSimulation");
			}
			if (store.state.machine.model.state.machineMode === MachineMode.fff) {
				return this.$t(this.isPaused ? "panel.jobControl.resumePrint" : "panel.jobControl.pausePrint");
			}
			return this.$t(this.isPaused ? "panel.jobControl.resumeJob" : "panel.jobControl.pauseJob");
		},
		cancelText(): string {
			if (this.isSimulating) {
				return this.$t("panel.jobControl.cancelSimulation");
			}
			if (store.state.machine.model.state.machineMode === MachineMode.fff) {
				return this.$t("panel.jobControl.cancelPrint");
			}
			return this.$t("panel.jobControl.cancelJob");
		},
		processAnotherCode() {
			if (store.state.machine.model.job.lastFileName !== null) {
				if (store.state.machine.model.job.lastFileSimulated && (store.state.machine.model.job.lastFileAborted || store.state.machine.model.job.lastFileCancelled)) {
					return `M37 P"${escapeFilename(store.state.machine.model.job.lastFileName)}"`;
				}
				return `M32 "${escapeFilename(store.state.machine.model.job.lastFileName)}"`;
			}
			return "";
		},
		processAnotherIcon() {
			if (store.state.machine.model.job.lastFileSimulated && !(store.state.machine.model.job.lastFileAborted || store.state.machine.model.job.lastFileCancelled)) {
				return (!store.state.machine.model.state.machineMode || store.state.machine.model.state.machineMode === MachineMode.fff) ? "mdi-printer" : "mdi-play";
			}
			return "mdi-restart";
		},
		processAnotherText() {
			if (store.state.machine.model.job.lastFileSimulated) {
				if (store.state.machine.model.job.lastFileAborted || store.state.machine.model.job.lastFileCancelled) {
					return this.$t('panel.jobControl.repeatSimulation');
				}
				return (!store.state.machine.model.state.machineMode || store.state.machine.model.state.machineMode === MachineMode.fff) ? this.$t('panel.jobControl.printNow') : this.$t("panel.jobControl.startJob");
			}
			if (store.state.machine.model.state.machineMode === MachineMode.fff) {
				return this.$t('panel.jobControl.repeatPrint');
			}
			return this.$t('panel.jobControl.repeatJob');
		},
		thumbnails(): Array<ThumbnailInfo> {
			const thumbnails = (store.state.machine.model.job.file !== null) ? store.state.machine.model.job.file.thumbnails.slice() : [];
			thumbnails.sort((a, b) => (b.width * b.height) - (a.width * a.height));		// return biggest thumbnails first
			return thumbnails;
		},
		validThumbnails(): Array<ThumbnailInfo> {
			return this.thumbnails.filter(thumbnail => !!thumbnail.data);
		}
	},
	data() {
		return {
			isSimulating: false
		}
	},
	mounted() {
		this.isSimulating = (store.state.machine.model.state.status === MachineStatus.simulating);
	},
	watch: {
		isPrinting(to: boolean) {
			if (to) {
				this.isSimulating = (store.state.machine.model.state.status === MachineStatus.simulating);
			} else {
				this.isSimulating = false;
			}
		}
	}
});
</script>
