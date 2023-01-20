<style scoped>
.content {
	position: relative;
	min-height: 480px;
}

.content canvas {
	position: absolute;
}

th {
	white-space: nowrap;
}
</style>

<template>
	<v-row>
		<v-col>
			<v-card>
				<v-tabs v-model="tab">
					<!-- Tabs -->
					<v-tab href="#current">
						<v-icon class="mr-1">mdi-information</v-icon>
						Current Settings
					</v-tab>
					<v-tab href="#analysis">
						<v-icon class="mr-1">mdi-file</v-icon>
						Motion Analysis
					</v-tab>
					<!--<v-tab href="#comparison">
						<v-icon class="mr-1">mdi-compare-horizontal</v-icon>
						Comparison
					</v-tab>-->

					<v-btn color="success" class="align-self-center ml-auto mr-2 hidden-sm-and-down" :disabled="uiFrozen" @click="showDataCollection = true">
						<v-icon class="mr-1">mdi-record</v-icon>
						Record Motion Profile
					</v-btn>
				</v-tabs>

				<v-tabs-items v-model="tab">
					<!-- Current Settings -->
					<v-tab-item value="current">
						<div class="d-flex flex-column">
							<v-alert :value="!isInputShapingEnabled" type="info" class="mb-0">
								Input Shaping is not configured. Record a new Motion Profile to set it up
							</v-alert>
							<div v-show="isInputShapingEnabled" class="content flex-grow-1 pa-2">
								<input-shaping-chart    :frequencies="currentFrequencies" :ringing-frequency="frequency"
														:input-shapers="inputShapers" :input-shaper-frequency="frequency" :input-shaper-damping="damping"
														:custom-amplitudes="customAmplitudes" :custom-durations="customDurations"
								/>
							</div>
						</div>
					</v-tab-item>

					<!-- File Analysis -->
					<v-tab-item value="analysis">
						<div class="d-flex flex-column">
							<v-progress-linear :active="loadingFiles" indeterminate/>
							<v-alert :value="files.length === 0 && !filesError" type="info" class="mb-0">
								No Motion Profiles found. Record a new Motion Profile or <a href="javascript:void(0)" class="white--text text-decoration-underline" @click="refresh">refresh</a> the file list
							</v-alert>
							<v-alert :value="filesError" type="error" class="mb-0">
								{{ filesError }}
							</v-alert>
							<v-row v-show="files.length > 0" class="content pa-2">
								<v-col cols="auto" class="d-flex pa-0">
									<input-shaping-file-list    title="Motion Profiles" can-delete :files="files" @refresh="refresh"
																:selectedFiles.sync="filesToAnalyze" :frequencies.sync="fileFrequenciesToAnalyze" v-model="fileDataToAnalyze"
																:sample-start-index.sync="sampleStartIndex" :sample-end-index.sync="sampleEndIndex" :had-overflow.sync="hadOverflow"
																:estimate-shaper-effect.sync="estimateShaperEffect" :show-original-values.sync="showOriginalValues"
									/>
								</v-col>
								<v-col :class="!!filesToAnalyze.length ? 'd-none' : 'd-flex'" class="align-center justify-center">
									Please select a Motion Profile
								</v-col>
								<v-col v-show="!!filesToAnalyze.length" :class="!!filesToAnalyze.length ? 'd-flex' : 'd-none'" class="flex-column pa-0">
									<v-alert :value="hadOverflow" type="warning" class="mb-0">
										The selected motion profile contains overflows. It may not be accurate.
									</v-alert>

									<v-card outlined class="d-block fill-height pa-2">
										<input-shaping-chart    can-show-samples :sample-start-index.sync="sampleStartIndex" :sample-end-index.sync="sampleEndIndex"
																:frequencies="fileFrequenciesToAnalyze" :value="fileDataToAnalyze" :ringing-frequency="frequency"
																:input-shapers="inputShapers" :input-shaper-frequency="frequency" :input-shaper-damping="damping"
																:custom-amplitudes="customAmplitudes" :custom-durations="customDurations"
																:estimate-shaper-effect="estimateShaperEffect" :show-values="showOriginalValues"
										/>
									</v-card>
								</v-col>
							</v-row>
						</div>
					</v-tab-item>
				</v-tabs-items>
			</v-card>
		</v-col>

		<v-col cols="auto">
			<v-card tile>
				<v-card-title class="pb-2">
					<v-icon class="mr-1">mdi-transition</v-icon>
					Input Shapers
				</v-card-title>
				<v-card-text class="d-flex flex-column">
					<input-shaper-checkbox v-model="inputShapers" value="none" :current="shaping.type" class="mt-0"/>
					<input-shaper-checkbox v-model="inputShapers" value="mzv" :current="shaping.type"/>
					<input-shaper-checkbox v-model="inputShapers" value="zvd" :current="shaping.type"/>
					<input-shaper-checkbox v-model="inputShapers" value="zvdd" :current="shaping.type"/>
					<input-shaper-checkbox v-model="inputShapers" value="zvddd" :current="shaping.type"/>
					<input-shaper-checkbox v-model="inputShapers" value="ei2" :current="shaping.type"/>
					<input-shaper-checkbox v-model="inputShapers" value="ei3" :current="shaping.type"/>
					<input-shaper-checkbox v-model="inputShapers" value="custom" :current="shaping.type">
						<v-menu v-model="customMenu" offset-y left :close-on-content-click="false" :max-width="380" ref="customMenu">
							<template #activator="{ on, attrs }">
								<v-chip v-show="!uiFrozen" small :color="shaping.type === 'custom' ? 'success' : 'info'" v-bind="attrs" v-on="on">edit</v-chip>
							</template>

							<v-card>
								<v-card-title>
									Custom Shaper Configuration
								</v-card-title>
								<v-card-text class="pb-2">
									<v-select v-model="numCustomCoefficients" label="Number of Impulses" :items="[0, 1,2,3,4]" hide-details/>
								</v-card-text>

								<v-simple-table v-show="numCustomCoefficients > 0">
									<thead>
									<tr>
										<th class="text-center">Impulse</th>
										<th>Amplitude</th>
										<th>Duration (in ms)</th>
									</tr>
									</thead>
									<tbody>
									<tr v-for="(_, index) in customAmplitudes" :key="index">
										<td class="text-center">
											{{ index + 1 }}
										</td>
										<td>
											<v-text-field type="number" min="0" step="0.001" :value="customAmplitudes[index]" @input="setCustomAmplitude(index, $event)" class="pt-0 mb-1" hide-details/>
										</td>
										<td>
											<v-text-field type="number" min="0" step="0.1" :value="customDurations[index] * 1000" @input="setCustomDuration(index, $event)" class="pt-0 mb-1" hide-details/>
										</td>
									</tr>
									</tbody>
								</v-simple-table>
								<v-divider v-show="numCustomCoefficients > 0"/>

								<v-card-text v-show="!!customShaperCode" class="pb-0">
									<label >Resulting configuration code:</label>
									<div class="d-flex">
										<input ref="customShaperCode" type="text" :value="customShaperCode" class="flex-grow-1" readonly @click="$event.target.select()" />
										<v-icon small class="ml-1" @click="copy">mdi-content-copy</v-icon>
									</div>
								</v-card-text>

								<v-card-actions class="justify-center">
									<v-btn text :disabled="!canConfigureCustom" :loading="configuringCustomShaper" color="primary" @click="configureCustomShaper">
										<v-icon class="mr-1">mdi-check</v-icon>
										Apply
									</v-btn>
								</v-card-actions>
							</v-card>
						</v-menu>
					</input-shaper-checkbox>

					<v-divider class="mt-3"/>

					<v-text-field type="number" min="10" step="1" max="1000" v-model.number="frequency" :disabled="uiFrozen" label="Shaper centre frequency" class="mt-3" hide-details @keydown.enter.prevent="setFrequency">
						<template #append>
							Hz
						</template>
						<template #append-outer>
							<v-icon class="ml-1" :disabled="!canSetFrequency" @click="setFrequency">mdi-check</v-icon>
						</template>
					</v-text-field>

					<v-text-field type="number" min="0.01" step="0.01" max="0.99" v-model.number="damping" :disabled="uiFrozen" label="Damping factor" class="mt-3" hide-details @keydown.enter.prevent="setDamping">
						<template #append-outer>
							<v-icon class="ml-1" :disabled="!canSetDamping" @click="setDamping">mdi-check</v-icon>
						</template>
					</v-text-field>
				</v-card-text>
			</v-card>
		</v-col>

		<record-motion-profile-dialog :last-run="lastRun" :shown.sync="showDataCollection" @finished="recordingFinished"/>
	</v-row>
</template>

<script>
'use strict'

import { InputShapingType } from '@duet3d/objectmodel';
import Vue from 'vue';
import { mapState, mapGetters, mapActions } from 'vuex';

import Events from '@/utils/events';
import Path from '@/utils/path';

import RecordMotionProfileDialog from './RecordMotionProfileDialog';
import InputShaperCheckbox from './InputShaperCheckbox';
import InputShapingChart from './InputShapingChart';
import InputShapingFileList from './InputShapingFileList';

export default {
	components: {
		RecordMotionProfileDialog,
		InputShaperCheckbox,
		InputShapingChart,
		InputShapingFileList
	},
	computed: {
		...mapState('machine/model', {
			shaping: state => state.move.shaping
		}),
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected', 'uiFrozen']),

		isInputShapingEnabled() { return this.shaping.type !== InputShapingType.none; },
		currentFrequencies() { return Array.from({ length: 81 }, (_, index) => index + 10); },

		lastRun() {
			let lastRun = 0;
			for (let filename of this.files) {
				const runMatch = /^(\d+)-/.exec(filename);
				if (runMatch) {
					const run = parseInt(runMatch[1]);
					if (run > lastRun) {
						lastRun = run;
					}
				}
			}
			return lastRun;
		},

		numCustomCoefficients: {
			get() { return this.customAmplitudes.length; },
			set(value) {
				if (this.customAmplitudes.length > value) {
					this.customAmplitudes.splice(value);
					this.customDurations.splice(value);
				} else {
					for (let i = this.customAmplitudes.length; i < value; i++) {
						this.customAmplitudes.push(0);
						this.customDurations.push(0);
					}
				}
			}
		},
		canConfigureCustom() {
			return this.numCustomCoefficients > 0 && this.customAmplitudes.every(amplitude => amplitude > 0) && this.customDurations.every(duration => duration > 0);
		},
		customShaperCode() {
			if (this.inputShapers.includes('custom') && this.canConfigureCustom) {
				const amplitudes = this.customAmplitudes.map(amplitude => amplitude.toFixed(3)).reduce((a, b) => a + ':' + b);
				const durations = this.customDurations.map(duration => duration.toFixed(4)).reduce((a, b) => a + ':' + b);
				return `M593 P"custom" H${amplitudes} T${durations}`;
			}
			return '';
		},
		canSetFrequency() {
			return !this.uiFrozen && !isNaN(this.frequency) && this.frequency !== this.shaping.frequency;
		},
		canSetDamping() {
			return !this.uiFrozen && !isNaN(this.damping) && this.damping !== this.shaping.damping;
		}
	},
	data() {
		return {
			tab: null,
			showDataCollection: false,

			inputShapers: [],
			customAmplitudes: [],
			customDurations: [],
			customMenu: false,
			configuringCustomShaper: false,
			frequency: 0,
			damping: 0.1,

			files: [],
			loadingFiles: false,
			filesError: null,

			filesToAnalyze: [],
			fileFrequenciesToAnalyze: [],
			fileDataToAnalyze: null,
			showOriginalValues: true,
			estimateShaperEffect: false,
			sampleStartIndex: null,
			sampleEndIndex: null,
			hadOverflow: false
		}
	},
	methods: {
		...mapActions('machine', ['getFileList', 'sendCode']),

		// Recorder
		recordingFinished() {
			this.tab = 'analysis';
			this.refresh();
		},

		// Input Shaper Settings
		setCustomAmplitude(index, value) {
			const val = parseFloat(value);
			if (!isNaN(val) && val >= 0) {
				Vue.set(this.customAmplitudes, index, val);
			}
		},
		setCustomDuration(index, value) {
			const val = parseFloat(value);
			if (!isNaN(val) && val >= 0) {
				Vue.set(this.customDurations, index, val / 1000);
			}
		},
		copy() {
			this.$refs.customShaperCode.focus();
			this.$refs.customShaperCode.select();
			document.execCommand('copy');
		},
		async configureCustomShaper() {
			this.configuringCustomShaper = true;
			try {
				await this.sendCode(this.customShaperCode);
			} finally {
				this.customMenu = this.configuringCustomShaper = false;
			}
		},
		async setFrequency() {
			if (this.canSetFrequency) {
				await this.sendCode(`M593 F${this.frequency}`);
			}
		},
		async setDamping() {
			if (this.canSetDamping) {
				await this.sendCode(`M593 S${this.damping}`);
			}
		},

		// Files
		async refresh() {
			if (!this.isConnected) {
				this.files = [];
				this.loadingFiles = false;
				this.errorMessage = null;
				return;
			}

			if (this.loadingFiles) {
				// Don't do multiple actions at once
				return;
			}

			this.loadingFiles = true;
			try {
				const files = (await this.getFileList(Path.accelerometer)).filter(file => !file.isDirectory && file.name !== Path.filamentsFile && file.name.endsWith('.csv'));
				files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
				this.files = files.map(file => file.name);
			} finally {
				this.loadingFiles = false;
			}
		},
		filesOrDirectoriesChanged({ machine, files }) {
			if (machine === this.selectedMachine) {
				if (this.filesToAnalyze.some(fileToAnalyze => files.includes(Path.combine(Path.accelerometer, fileToAnalyze)))) {
					// Current file being analyzed has bene changed, invalidate it
					this.filesToAnalyze = [];
				} else if (files.some(file => file.endsWith('.csv')) && Path.filesAffectDirectory(files, Path.accelerometer)) {
					// CSV file or directory has been changed
					this.refresh();
				}
			}
		}
	},
	mounted() {
		// Reload the file list
		this.refresh();

		// Init the current values
		if (this.shaping.type === 'none') {
			this.inputShapers = [];
		} else {
			this.inputShapers.push(this.shaping.type);
		}
		this.frequency = this.shaping.frequency;
		this.damping = this.shaping.damping;
		this.customAmplitudes = this.shaping.amplitudes.slice();
		this.customDurations = this.shaping.durations.slice();

		// Keep track of file changes
		this.$root.$on(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);
	},
	beforeDestroy() {
		// No longer keep track of file changes
		this.$root.$off(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);
	},
	watch: {
		'shaping.type'(to) {
			if (to === 'none') {
				this.inputShapers = [];
			} else {
				if (!this.inputShapers.includes(to)) {
					this.inputShapers.push(to);
				}

				if (to === 'custom') {
					this.customAmplitudes = this.shaping.amplitudes.slice();
					this.customDurations = this.shaping.durations.slice();
				}
			}
		},
		'shaping.amplitudes': {
			deep: true,
			handler(to) {
				if (!this.inputShapers.includes('custom') || this.shaping.type === 'custom') {
					this.customAmplitudes = to.slice();
				}
			}
		},
		'shaping.durations': {
			deep: true,
			handler(to) {
				if (!this.inputShapers.includes('custom') || this.shaping.type === 'custom') {
					this.customDurations = to.slice();
				}
			}
		},
		'shaping.frequency'(to) {
			this.frequency = to;
		},
		'shaping.damping'(to) {
			this.damping = to;
		},
		numCustomCoefficients() {
			this.$nextTick(() => {
				if (this.$refs.customMenu) {
					this.$refs.customMenu.updateDimensions();
				}
			});
		},
		selectedMachine() {
			this.refresh();
		}
	}
}
</script>
