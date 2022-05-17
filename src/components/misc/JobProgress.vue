<template>
	<v-row dense>
		<v-col cols="12" class="d-flex">
			<span>{{ printStatus }}</span>
			<v-spacer/>
			<span>{{ printDetails }}</span>
		</v-col>

		<v-col cols="12">
			<v-progress-linear :value="jobProgress * 100" class="my-1"></v-progress-linear>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

import { MachineMode, isPrinting, StatusType } from '../../store/machine/modelEnums.js'
import { extractFileName } from '../../utils/path.js'

export default {
	computed: {
		...mapState('machine/model', {
			extruders: state => state.move.extruders,
			job: state => state.job,
			machineMode: state => state.state.machineMode,
			status: state => state.state.status
		}),
		...mapGetters('machine/model', ['jobProgress']),
		printStatus() {
			if (isPrinting(this.status)) {
				if (this.printFile) {
					const progress = this.$display(this.jobProgress * 100, 1, '%');
					if (this.isSimulating) {
						return this.$t('jobProgress.simulating', [this.printFile, progress]);
					}
					if (this.machineMode === MachineMode.fff) {
						return this.$t('jobProgress.printing', [this.printFile, progress]);
					}
					return this.$t('jobProgress.processing', [this.printFile, progress]);
				}
				return this.$t('generic.loading');
			} else if (this.lastPrintFile) {
				if (this.job.lastFileSimulated) {
					return this.$t('jobProgress.simulated', [this.lastPrintFile]);
				}
				if (this.machineMode === MachineMode.fff) {
					return this.$t('jobProgress.printed', [this.lastPrintFile]);
				}
				return this.$t('jobProgress.processed', [this.lastPrintFile]);
			}
			return this.$t('jobProgress.noJob');
		},
		printDetails() {
			if (!isPrinting(this.status)) {
				return '';
			}

			let details = '';
			if (this.job.layer !== null && this.job.file.numLayers) {
				details = this.$t('jobProgress.layer', [this.job.layer, this.job.file.numLayers]);
			}
			if (this.extruders.length > 0) {
				if (details !== '') {
					details += ', ';
				}
				const totalRawExtruded = (this.job.rawExtrusion !== null) ? this.job.rawExtrusion :
											this.extruders
												.map(extruder => extruder.rawPosition)
												.reduce((a, b) => a + b);
				details += this.$t('jobProgress.filament', [this.$display(totalRawExtruded, 1, 'mm')]);
				if (this.job.file.filament.length > 0) {
					const needed = this.job.file.filament.reduce((a, b) => a + b);
					details += ' (' + this.$t('jobProgress.filamentRemaining', [this.$display(Math.max(needed - totalRawExtruded, 0), 1, 'mm')]) + ')';
				}
			}
			return details;
		},
		printFile() {
			return (this.job.file.fileName !== null) ? extractFileName(this.job.file.fileName) : null;
		},
		lastPrintFile() {
			return (this.job.lastFileName !== null) ? extractFileName(this.job.lastFileName) : null;
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
			} else if (!isPrinting(to)) {
				this.isSimulating = false;
			}
		}
	}
}
</script>
