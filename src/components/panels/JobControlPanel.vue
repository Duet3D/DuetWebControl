<template>
	<v-card>
		<v-card-title class="pb-1">
			<v-icon small class="mr-1">mdi-wrench</v-icon> {{ $t('panel.jobControl.caption') }}
		</v-card-title>

		<v-card-text class="pt-0">
			<code-btn color="warning" block :disabled="uiFrozen || !isPrinting || isPausing" :code="isPaused ? 'M24' : 'M25'" tabindex="0">
				<v-icon class="mr-1">{{ isPaused ? 'mdi-play' : 'mdi-pause' }}</v-icon> {{ pauseResumeText }}
			</code-btn>

			<code-btn v-if="isPaused" color="error" block code="M0">
				<v-icon class="mr-1">mdi-stop</v-icon> {{ cancelText }}
			</code-btn>

			<code-btn v-if="!isPrinting && processAnotherCode" color="success" block :code="processAnotherCode">
				<v-icon class="mr-1">mdi-restart</v-icon> {{ processAnotherText }}
			</code-btn>

			<v-menu v-if="thumbnails.some(thumbnail => thumbnail.data !== null)" open-on-click offset-y>
				<template #activator="{ attrs, on }">
					<v-btn color="info" block :disabled="uiFrozen" class="mt-3" v-bind="attrs" v-on="on">
						<v-icon class="mr-1">mdi-image</v-icon> {{ $t('panel.jobControl.showPreview' )}}
					</v-btn>
				</template>

				<v-card>
					<v-carousel height="auto" hide-delimiters :show-arrows="validThumbnails.length > 1" show-arrows-on-hover>
						<v-carousel-item v-for="thumbnail in validThumbnails" :key="`${thumbnail.format}-${thumbnail.width}x${thumbnail.height}`">
							<div class="d-flex fill-height align-center">
								<thumbnail-img :thumbnail="thumbnail" class="mx-auto"/>
							</div>
						</v-carousel-item>
					</v-carousel>
				</v-card>
			</v-menu>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

import { MachineMode, StatusType, isPaused, isPrinting } from '@/store/machine/modelEnums'

export default {
	computed: {
		...mapState('machine/model', {
			lastFileName: state => state.job.lastFileName,
			lastFileSimulated: state => state.job.lastFileSimulated,
			machineMode: state => state.state.machineMode,
			status: state => state.state.status,
			thumbnails: state => state.job.file.thumbnails
		}),
		...mapGetters(['uiFrozen']),
		isPausing() { return this.status === StatusType.pausing; },
		isPaused() { return isPaused(this.status); },
		isPrinting() { return isPrinting(this.status); },
		pauseResumeText() {
			if (this.isSimulating) {
				return this.$t(this.isPaused ? 'panel.jobControl.resumeSimulation' : 'panel.jobControl.pauseSimulation');
			}
			if (this.machineMode === MachineMode.fff) {
				return this.$t(this.isPaused ? 'panel.jobControl.resumePrint' : 'panel.jobControl.pausePrint');
			}
			return this.$t(this.isPaused ? 'panel.jobControl.resumeJob' : 'panel.jobControl.pauseJob');
		},
		cancelText() {
			if (this.isSimulating) {
				return this.$t('panel.jobControl.cancelSimulation');
			}
			if (this.machineMode === MachineMode.fff) {
				return this.$t('panel.jobControl.cancelPrint');
			}
			return this.$t('panel.jobControl.cancelJob');
		},
		processAnotherCode() {
			if (this.lastFileName) {
				if (this.lastFileSimulated) {
					return `M37 P"${this.lastFileName}"`;
				}
				return `M32 "${this.lastFileName}"`;
			}
			return '';
		},
		processAnotherText() {
			if (this.lastFileSimulated) {
				return this.$t('panel.jobControl.repeatSimulation');
			}
			if (this.machineMode === MachineMode.fff) {
				return this.$t('panel.jobControl.repeatPrint');
			}
			return this.$t('panel.jobControl.repeatJob');
		},
		validThumbnails() {
			return this.thumbnails.filter(thumbnail => !!thumbnail.data);
		}
	},
	data() {
		return {
			isSimulating: false
		}
	},
	mounted() {
		this.isSimulating = (this.status === StatusType.simulating);
	},
	watch: {
		status(to) {
			if (to === StatusType.simulating) {
				this.isSimulating = true;
			} else if (!this.isPrinting) {
				this.isSimulating = false;
			}
		}
	}
}
</script>
