<style scoped>
.filelist {
	overflow-y: scroll;
	max-height: 480px;
}

.no-overflow {
	text-overflow: clip
}

.no-wrap {
	flex-wrap: nowrap;
	white-space: nowrap;
}
</style>

<template>
	<v-card flat class="d-flex flex-column">
		<v-card-title class="pt-2 pb-1 no-wrap">
			<v-icon class="mr-2">mdi-format-list-bulleted</v-icon> {{ title }}
			<v-spacer />
			<v-icon class="ml-2" :disabled="uiFrozen" @click="$emit('refresh')">mdi-refresh</v-icon>
		</v-card-title>

		<v-card-text class="pa-0" v-show="files.length === 0">
			<v-alert :value="true" type="info" class="mb-0">
				No Profiles
			</v-alert>
		</v-card-text>
		<v-progress-linear :active="progress !== progressMax" :value="(progress / progressMax) * 100" />

		<template v-if="profiles.length > 0">
			<template v-if="!individualFiles">
				<v-list class="filelist py-0" :disabled="uiFrozen || progress !== progressMax" dense>
					<v-list-item-group color="primary" v-model="selection">
						<v-list-item v-for="(profile, index) in profiles" :key="index"
									 :value="profile.files.map(item => item.filename)" :title="profile.lastModified"
									 two-line v-ripple>
							<v-list-item-icon class="align-self-center">
								<v-icon>
									{{ profile.icon }}
								</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title class="no-overflow">
									{{ profile.title }}
								</v-list-item-title>
								<v-list-item-subtitle class="no-overflow">
									{{ profile.subtitle }}
								</v-list-item-subtitle>
								<v-list-item-subtitle v-if="profile.secondSubtitle" class="no-overflow">
									{{ profile.secondSubtitle }}
								</v-list-item-subtitle>
							</v-list-item-content>
							<v-list-item-icon v-if="canDelete" class="align-self-center"
											  @click.stop.prevent="deleteProfile(profile)">
								<v-icon>
									mdi-delete
								</v-icon>
							</v-list-item-icon>
						</v-list-item>
					</v-list-item-group>
				</v-list>
			</template>
			<template v-else>
				<v-list class="py-0 filelist" :disabled="uiFrozen || progress !== progressMax" dense>
					<v-list-group v-for="(profile, index) in profiles" :key="index" :title="profile.lastModified">
						<template #activator>
							<v-list-item-icon class="align-self-center">
								<v-icon>
									{{ profile.icon }}
								</v-icon>
							</v-list-item-icon>
							<v-list-item-content>
								<v-list-item-title class="no-overflow">
									{{ profile.title }}
								</v-list-item-title>
								<v-list-item-subtitle class="no-overflow">
									{{ profile.subtitle }}
								</v-list-item-subtitle>
								<v-list-item-subtitle v-if="profile.secondSubtitle" class="no-overflow">
									{{ profile.secondSubtitle }}
								</v-list-item-subtitle>
							</v-list-item-content>
						</template>

						<v-list-item-group v-model="selection">
							<v-list-item v-for="(file, fileIndex) in profile.files" :key="fileIndex"
										 :title="file.lastModified" :value="[file.filename]" v-ripple>
								<v-list-item-icon>
									<v-icon>mdi-file</v-icon>
								</v-list-item-icon>
								<v-list-item-title class="no-overflow">
									{{ file.title }}
								</v-list-item-title>
								<v-list-item-icon v-if="canDelete" @click.stop.prevent="deleteFile(file.filename)">
									<v-icon>
										mdi-delete
									</v-icon>
								</v-list-item-icon>
							</v-list-item>
						</v-list-item-group>
					</v-list-group>
				</v-list>
			</template>
		</template>
		<template v-else>
			<v-alert type="info" class="mb-0">
				No Profiles found
			</v-alert>
		</template>

		<v-spacer />

		<v-checkbox v-show="!individualFiles && estimateEffect" :input-value="showOriginalValues"
					@change="$emit('update:showOriginalValues', $event)" label="Show original values" hide-details
					class="ma-3 mb-0" />
		<v-checkbox v-show="!individualFiles" v-model="estimateEffect" label="Estimate shaper effect" hide-details
					class="ma-3 mb-0" />
		<div :class="individualFiles ? 'd-flex' : 'd-none'" class="justify-space-between ma-3 mb-0">
			<v-checkbox :value="showSamples" @change="setShowSamples($event)" label="Show samples" hide-details
						class="mt-0" />
			<v-btn v-show="showSamples" color="primary" small :disabled="selection.length === 0"
				   @click="showSamples = false">
				<v-icon class="mr-1" small>mdi-poll</v-icon>
				Analyze
			</v-btn>
		</div>
		<v-checkbox v-model="individualFiles" label="Display individual files" hide-details class="ma-3" />
	</v-card>
</template>

<script>
'use strict'

import { analyzeAccelerometerData } from '@duet3d/motionanalysis';
import { mapActions, mapState } from 'pinia';

import Path from "@/utils/path";
import CSV from "@/utils/csv";
import { useMachineStore } from '@/store/machine';

export default {
	props: {
		title: {
			required: true,
			type: String
		},
		files: {
			required: true,
			type: Array
		},
		filesLastModified: {
			required: true,
			type: Array
		},

		estimateShaperEffect: Boolean,
		showOriginalValues: Boolean,
		sampleStartIndex: Number,
		sampleEndIndex: Number,

		canDelete: Boolean,
		canShowSamples: Boolean,
		wideBand: Boolean,

		selectedFiles: Array,
		frequencies: Array,
		value: Object,
		hadOverflow: Boolean
	},
	computed: {
		...mapState(useUiStore, ["uiFrozen"]),
		profiles() {
			// Convert files into profile groups with files
			const profiles = [], uncategorized = [];
			for (let i = 0; i < this.files.length; i++) {
				const filename = this.files[i], lastModified = this.filesLastModified[i].toLocaleString();
				const matches = /^(\d+)-([a-zA-SU-Z]+)(-?\d+\.?\d*)-(-?\d+\.?\d*)-(\d+\.?\d*)-(\w+)-?(\d+\.?\d*)?(Hz)?(-(\d+\.?\d*))?\.csv/.exec(filename);
				if (matches) {
					const title = `Profile #${matches[1]}`;
					let run = profiles.find(profile => profile.title === title);
					if (!run) {
						run = {
							icon: 'mdi-run',
							title,
							subtitle: '',
							files: [],
							lastModified
						};
						profiles.push(run);
					}

					const shaperTitle = (matches[6] === 'none') ? 'No Shaping' : ((matches[6] === 'custom') ? 'Custom' : `${matches[6].toUpperCase()} @ ${matches[7]}Hz`);
					const dampingFactor = isNaN(matches[10]) ? null : `Damping Factor ${matches[10]}`;
					run.files.push({
						title: `${matches[2].split('').reduce((a, b) => `${a}+${b}`)} ${matches[3]}-${matches[4]}, accelerometer ${matches[5]}, ${shaperTitle}`,
						filename,
						shaperTitle,
						dampingFactor,
						lastModified
					});
				} else {
					const toolMatches = /^(\d+)-T(\d+)-([a-zA-Z]+)(-?\d+\.?\d*)-(-?\d+\.?\d*)-(\d+\.?\d*)-(\w+)[-]?(\d+\.?\d*)?(Hz)?(-(\d+\.?\d*))?\.csv/.exec(filename);
					if (toolMatches) {
						const title = `Profile #${toolMatches[1]}`;
						let run = profiles.find(profile => profile.title === title);
						if (!run) {
							run = {
								icon: 'mdi-run',
								title,
								subtitle: '',
								files: [],
								lastModified
							};
							profiles.push(run);
						}

						const shaperTitle = (toolMatches[7] === 'none') ? 'No Shaping' : ((toolMatches[7] === 'custom') ? 'Custom' : `${toolMatches[7].toUpperCase()} @ ${toolMatches[8]}Hz`);
						const dampingFactor = isNaN(toolMatches[11]) ? null : `Damping Factor ${toolMatches[11]}`;
						run.files.push({
							title: `T${toolMatches[2]}, ${toolMatches[3].split('').reduce((a, b) => `${a}+${b}`)} ${toolMatches[4]}-${toolMatches[5]}, accelerometer ${toolMatches[6]}, ${shaperTitle}`,
							filename,
							shaperTitle,
							dampingFactor,
							lastModified
						});
					} else {
						const filenameMatch = /(.+)\.csv$/.exec(filename);
						if (filenameMatch) {
							uncategorized.push({
								title: filenameMatch[1],
								filename,
								lastModified
							});
						}
					}
				}
			}

			// Create the subtitles for each group
			for (let profile of profiles) {
				const shaperTitles = profile.files.map(file => file.shaperTitle);
				if (shaperTitles.length > 0) {
					let allEqual = true;
					for (let type of shaperTitles) {
						if (type !== shaperTitles[0]) {
							allEqual = false;
							break;
						}
					}
					profile.subtitle = `${allEqual ? shaperTitles[0] : 'Multiple configs'}, ${profile.files.length} moves`;
					profile.secondSubtitle = profile.files[0].dampingFactor;
				} else {
					profile.subtitle = `${profile.files.length} moves`;
					profile.secondSubtitle = null;
				}
			}

			// Add uncategorized files in single-file mode
			if (this.individualFiles && uncategorized.length > 0) {
				profiles.push({
					icon: 'mdi-file-multiple',
					title: 'Uncategorized',
					subtitle: `${uncategorized.length} files`,
					secondSubtitle: null,
					files: uncategorized
				});
			}
			return profiles;
		}
	},
	data() {
		return {
			selection: [],
			progress: 0,
			progressMax: 0,
			estimateEffect: false,
			individualFiles: false,
			showSamples: false
		}
	},
	methods: {
		...mapActions(useMachineStore, ['delete', 'download']),
		async deleteProfile(profile) {
			this.progress = 0;
			this.progressMax = profile.files.length;
			try {
				for (let file of profile.files) {
					await this.delete(Path.combine(Path.accelerometer, file.filename));
					this.progress++;
				}
			} finally {
				this.progress = this.progressMax = 0;
			}
			this.$emit('refresh');
		},
		async deleteFile(filename) {
			this.progress = 0;
			this.progressMax = 1;
			try {
				await this.delete(Path.combine(Path.accelerometer, filename));
			} finally {
				this.progress = this.progressMax = 0;
			}
			this.$emit('refresh');
		},
		setShowSamples(value) {
			if (!value) {
				this.sampleStartIndex = this.sampleEndIndex = null;
			}
			this.showSamples = value;
		},
		async getSamples(filename) {
			// Download the selected file
			const csvFile = await this.download({ filename: Path.combine(Path.accelerometer, filename), type: 'text' }, false, false, false);

			// Load the CSV
			const csv = new CSV(csvFile);
			if (csv.headers.length < 4 || csv.headers[0] !== 'Sample' || csv.content.length < 4) {
				throw new Error('Invalid accelerometer CSV');
			}

			// Extract details
			const details = /Rate (\d+) overflows (\d)/.exec(csv.content[csv.content.length - 1].reduce((a, b) => a + b));
			if (!details) {
				throw new Error('Failed to read rate and overflows');
			}
			const samplingRate = parseFloat(details[1]), overflows = parseFloat(details[2]);

			// Report if there were any overflows
			if (overflows > 0) {
				this.$emit('update:hadOverflow', true);
			}

			// Generate result
			const result = {
				samplingRate,
				samples: Array.from({ length: csv.content[0].length - 1 }, () => [])
			};

			for (let sample = 0; sample < csv.content.length - 1; sample++) {
				const sampleValues = csv.content[sample];
				for (let axis = 1; axis < sampleValues.length; axis++) {
					result.samples[axis - 1].push(parseFloat(sampleValues[axis]));
				}
			}

			return result;
		},
		getFrequencyResponse(datasets) {
			// Don't do anything if no samples are given
			if (!datasets || datasets.length === 0) {
				return {};
			}

			// Make sure all the datasets have the same sampling rate and the same count
			// FIXME RepRapFirmware provides CSVs with varying sampling rates. For now we use the average rate...
			const samplingRate = (datasets.length > 1) ? datasets.map(dataset => dataset.samplingRate).reduce((a, b) => a + b) / datasets.length : datasets[0].samplingRate;
			const numAxes = datasets[0].samples.length, numSamples = datasets[0].samples[0].length;
			for (let i = 1; i < datasets.length; i++) {
				if (datasets[i].samples.length !== numAxes) {
					throw new Error('Datasets must have the same number of axes');
				}
				if (datasets[i].samples[0].length !== numSamples) {
					throw new Error('Datasets must have the same number of samples');
				}
			}

			// Analyze the datasets and combine the amplitudes
			const firstDataResult = analyzeAccelerometerData(datasets[0].samples, samplingRate, this.wideBand);
			const frequencies = firstDataResult.frequencies, amplitudes = firstDataResult.amplitudes;
			for (let dataset = 1; dataset < datasets.length; dataset++) {
				const dataResult = analyzeAccelerometerData(datasets[dataset].samples, samplingRate, this.wideBand);
				for (let axis = 0; axis < dataResult.amplitudes.length; axis++) {
					for (let i = 0; i < dataResult.amplitudes[axis].length; i++) {
						amplitudes[axis][i] += dataResult.amplitudes[axis][i];
					}
				}
			}

			// Return the frequencies and mean amplitudes
			return {
				frequencies,
				amplitudes: amplitudes.map(axisValues => axisValues.map(amplitude => amplitude / datasets.length))
			};
		},
		async update() {
			this.$emit('update:hadOverflow', false);
			if (this.selection.length > 0) {
				this.progress = 0;
				if (this.individualFiles && this.showSamples) {
					this.progressMax = 1;
					try {
						// Get the samples for the first requested file
						const sampleResult = await this.getSamples(this.selection[0]);
						this.$emit('update:selectedFiles', this.selection);
						this.$emit('update:frequencies', null);
						this.$emit('input', {
							X: sampleResult.samples[0],
							Y: sampleResult.samples[1],
							Z: sampleResult.samples[2]
						});
					} finally {
						this.progress = 1;
					}
				} else {
					this.progressMax = this.selection.length + 1;
					try {
						// Retrieve the samples for each file
						const datasets = [];
						for (let filename of this.selection) {
							const samples = await this.getSamples(filename);
							datasets.push(samples);
							this.progress++;
						}

						// Limit number of samples if previously selected
						if (datasets.length === 1 && typeof this.sampleStartIndex === 'number' && typeof this.sampleEndIndex === 'number') {
							for (let axisSamples of datasets[0].samples) {
								axisSamples.splice(this.sampleEndIndex + 1);
								axisSamples.splice(0, this.sampleStartIndex);
							}
						}

						// Perform FFT on each dataset and get the mean frequency response
						const frequencyResponse = this.getFrequencyResponse(datasets);
						this.$emit('update:selectedFiles', this.selection);
						this.$emit('update:frequencies', frequencyResponse.frequencies);
						this.$emit('input', {
							X: frequencyResponse.amplitudes[0],
							Y: frequencyResponse.amplitudes[1],
							Z: frequencyResponse.amplitudes[2]
						});
					} finally {
						this.progress = this.progressMax;
					}
				}
			} else {
				this.progress = this.progressMax = 0;
				this.$emit('update:frequencies', null);
				if (this.selectedFiles && this.selectedFiles.length > 0) {
					// Update this only if it's still populated, else we get stuck in an endless loop because [] != null
					this.$emit('update:selectedFiles', []);
				}
				this.$emit('input', null);
			}
		}
	},
	watch: {
		selectedFiles(to) {
			this.selection = to || [];
		},
		estimateEffect(to) {
			this.$emit('update:showOriginalValues', !to);
			this.$emit('update:estimateShaperEffect', to);
		},
		individualFiles(to) {
			this.selection = [];
			if (!to) {
				this.$emit('update:showOriginalValues', true);
			}
			this.$emit('update:useIndividualFiles', to);
		},
		selection() {
			this.update();
			this.$emit('update:sampleStartIndex', null);
			this.$emit('update:sampleEndIndex', null);
		},
		showSamples(to) {
			this.update();
			if (!to) {
				this.$emit('update:showOriginalValues', true);
			}
		}
	}
}
</script>