<style scoped>
.filelist {
	overflow-y: scroll;
	max-height: 480px;
}

.no-overflow {
	/* Let long subtitles wrap to a second line and ellipsis any extreme overflow rather than
	   clipping mid-word - the previous nowrap + clip combo dropped trailing characters
	   ("ZVD @ 62Hz, 2 n" instead of "2 moves") with no indication that they were cut */
	white-space: normal;
	overflow-wrap: anywhere;
}

/* Vuetify 4 wraps the subtitle slot in a `.v-list-item-subtitle` element that uses
   `display: -webkit-box` with `-webkit-line-clamp: N` (N from the `lines` prop). With two
   subtitle lines packed inside that single clamp budget, secondary text gets ellipsised even
   though there's vertical room in the row. Opt out of the webkit-box layout so each child
   renders as a normal block element and shows its content in full */
:deep(.v-list-item-subtitle) {
	display: block;
	-webkit-line-clamp: unset;
	overflow: visible;
}
</style>

<template>
	<v-card variant="flat" class="d-flex flex-column">
		<v-card-title class="d-flex align-center pt-2 pb-1 flex-nowrap text-no-wrap">
			<v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
			{{ title }}
			<v-spacer />
			<v-icon class="ml-2" :disabled="uiStore.uiFrozen" @click="emit('refresh')">mdi-refresh</v-icon>
		</v-card-title>

		<v-progress-linear :active="progress !== progressMax" :model-value="(progress / Math.max(progressMax, 1)) * 100" />

		<template v-if="profiles.length > 0">
			<v-list v-if="!individualFiles" class="filelist py-0" density="compact"
					:disabled="uiStore.uiFrozen || progress !== progressMax">
				<v-list-item v-for="(profile, index) in profiles" :key="index"
							 :active="isProfileActive(profile)"
							 :title="profile.title" :subtitle="profile.subtitle"
							 lines="three" :prepend-icon="profile.icon"
							 @click="toggleProfile(profile)">
					<template v-if="profile.secondSubtitle" #subtitle>
						<div class="no-overflow">{{ profile.subtitle }}</div>
						<div class="no-overflow">{{ profile.secondSubtitle }}</div>
					</template>
					<template v-if="canDelete" #append>
						<v-icon @click.stop="deleteProfile(profile)">mdi-delete</v-icon>
					</template>
				</v-list-item>
			</v-list>

			<v-list v-else class="filelist py-0" density="compact"
					:disabled="uiStore.uiFrozen || progress !== progressMax">
				<v-list-group v-for="(profile, index) in profiles" :key="index">
					<template #activator="{ props: activatorProps }">
						<v-list-item v-bind="activatorProps" :title="profile.title"
									 :subtitle="profile.subtitle" lines="three"
									 :prepend-icon="profile.icon">
							<template v-if="profile.secondSubtitle" #subtitle>
								<div class="no-overflow">{{ profile.subtitle }}</div>
								<div class="no-overflow">{{ profile.secondSubtitle }}</div>
							</template>
						</v-list-item>
					</template>

					<v-list-item v-for="(file, fileIndex) in profile.files" :key="fileIndex"
								 :active="selection.includes(file.filename)"
								 :title="file.title" prepend-icon="mdi-file"
								 @click="toggleFile(file.filename)">
						<template v-if="canDelete" #append>
							<v-icon @click.stop="deleteFile(file.filename)">mdi-delete</v-icon>
						</template>
					</v-list-item>
				</v-list-group>
			</v-list>
		</template>
		<v-alert v-else type="info" class="mb-0 flex-grow-0" :title="$t('plugins.accelerometer.noProfiles')" />

		<v-spacer />

		<v-checkbox v-if="!individualFiles && estimateEffect" v-model="showOriginalValuesModel"
					:label="$t('plugins.accelerometer.showOriginalValues')" hide-details
					density="compact" color="primary" class="ma-3 mb-0" />
		<v-checkbox v-if="!individualFiles" v-model="estimateEffect"
					:label="$t('plugins.accelerometer.estimateShaperEffect')" hide-details
					density="compact" color="primary" class="ma-3 mb-0" />

		<div v-if="individualFiles" class="d-flex justify-space-between ma-3 mb-0">
			<v-checkbox v-model="showSamples" :label="$t('plugins.accelerometer.showSamples')" hide-details
						density="compact" color="primary" class="mt-0" />
			<v-btn v-if="showSamples" color="primary" size="small" :disabled="selection.length === 0"
				   @click="showSamples = false">
				<v-icon class="mr-1" size="small">mdi-poll</v-icon>
				{{ $t("plugins.accelerometer.analyze") }}
			</v-btn>
		</div>

		<v-checkbox v-model="individualFiles" :label="$t('plugins.accelerometer.individualFiles')"
					density="compact" color="primary" hide-details class="mx-3" />
		<v-checkbox v-model="wideBandModel" :label="$t('plugins.accelerometer.wideBand')"
					density="compact" color="primary" hide-details class="ma-3" />
	</v-card>
</template>

<script setup lang="ts">
import { AccelerometerDataset, analyzeAccelerometerDatasets, parseAccelerometerCsv } from "@duet3d/motionanalysis";

import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import Path from "@/utils/path";

interface ProfileFile {
	title: string;
	filename: string;
	shaperTitle?: string;
	dampingFactor?: string | null;
	lastModified: string;
}

interface Profile {
	icon: string;
	title: string;
	subtitle: string;
	secondSubtitle: string | null;
	files: Array<ProfileFile>;
	lastModified: string;
}

const props = defineProps<{
	title: string;
	files: Array<string>;
	filesLastModified: Array<Date>;
	canDelete?: boolean;
	canShowSamples?: boolean;
}>();

const selectedFiles = defineModel<Array<string>>("selectedFiles", { default: () => [] });
const frequenciesModel = defineModel<Array<number> | null>("frequencies", { default: null });
const valueModel = defineModel<Record<string, number[]> | null>({ default: null });
const sampleStartIndex = defineModel<number | null>("sampleStartIndex", { default: null });
const sampleEndIndex = defineModel<number | null>("sampleEndIndex", { default: null });
const hadOverflowModel = defineModel<boolean>("hadOverflow", { default: false });
const estimateShaperEffectModel = defineModel<boolean>("estimateShaperEffect", { default: false });
const showOriginalValuesModel = defineModel<boolean>("showOriginalValues", { default: true });
const wideBandModel = defineModel<boolean>("wideBand", { default: false });

const emit = defineEmits<{
	refresh: [];
}>();

const machineStore = useMachineStore();
const uiStore = useUiStore();

const selection = ref<Array<string>>([]);
const progress = ref(0);
const progressMax = ref(0);
const estimateEffect = ref(false);
const individualFiles = ref(false);
const showSamples = ref(false);

// Parse the filename of each run into a structured profile entry; the leading number groups
// related files into one profile. Filenames that don't match either regex fall into an
// uncategorised bucket that only appears in individual-file mode
const profiles = computed<Array<Profile>>(() => {
	const grouped: Array<Profile> = [];
	const uncategorized: Array<ProfileFile> = [];

	for (let i = 0; i < props.files.length; i++) {
		const filename = props.files[i];
		const lastModified = props.filesLastModified[i].toLocaleString();
		const matches = /^(\d+)-([a-zA-SU-Z]+)(-?\d+\.?\d*)-(-?\d+\.?\d*)-(\d+\.?\d*)-(\w+)-?(\d+\.?\d*)?(Hz)?(-(\d+\.?\d*))?\.csv/.exec(filename);
		if (matches) {
			pushIntoProfile(grouped, lastModified, matches[1], parseMatch(matches, filename, false));
			continue;
		}

		const toolMatches = /^(\d+)-T(\d+)-([a-zA-Z]+)(-?\d+\.?\d*)-(-?\d+\.?\d*)-(\d+\.?\d*)-(\w+)[-]?(\d+\.?\d*)?(Hz)?(-(\d+\.?\d*))?\.csv/.exec(filename);
		if (toolMatches) {
			pushIntoProfile(grouped, lastModified, toolMatches[1], parseMatch(toolMatches, filename, true));
			continue;
		}

		const filenameMatch = /(.+)\.csv$/.exec(filename);
		if (filenameMatch) {
			uncategorized.push({ title: filenameMatch[1], filename, lastModified });
		}
	}

	// Fill in summary fields per group
	for (const profile of grouped) {
		const shaperTitles = profile.files.map((file) => file.shaperTitle);
		if (shaperTitles.length > 0) {
			const allEqual = shaperTitles.every((s) => s === shaperTitles[0]);
			profile.subtitle = `${allEqual ? shaperTitles[0] : "Multiple configs"}, ${profile.files.length} moves`;
			profile.secondSubtitle = profile.files[0].dampingFactor ?? null;
		} else {
			profile.subtitle = `${profile.files.length} moves`;
			profile.secondSubtitle = null;
		}
	}

	if (individualFiles.value && uncategorized.length > 0) {
		grouped.push({
			icon: "mdi-file-multiple",
			title: "Uncategorized",
			subtitle: `${uncategorized.length} files`,
			secondSubtitle: null,
			files: uncategorized,
			lastModified: "",
		});
	}

	return grouped;
});

function parseMatch(matches: RegExpExecArray, filename: string, isTool: boolean): ProfileFile {
	const lastModified = matches[0];
	if (isTool) {
		const shaperTitle = matches[7] === "none" ? "No Shaping"
			: matches[7] === "custom" ? "Custom"
			: `${matches[7].toUpperCase()} @ ${matches[8]}Hz`;
		const dampingFactor = Number.isNaN(parseFloat(matches[11])) ? null : `Damping Factor ${matches[11]}`;
		return {
			title: `T${matches[2]}, ${matches[3].split("").join("+")} ${matches[4]}-${matches[5]}, accelerometer ${matches[6]}, ${shaperTitle}`,
			filename,
			shaperTitle,
			dampingFactor,
			lastModified,
		};
	}
	const shaperTitle = matches[6] === "none" ? "No Shaping"
		: matches[6] === "custom" ? "Custom"
		: `${matches[6].toUpperCase()} @ ${matches[7]}Hz`;
	const dampingFactor = Number.isNaN(parseFloat(matches[10])) ? null : `Damping Factor ${matches[10]}`;
	return {
		title: `${matches[2].split("").join("+")} ${matches[3]}-${matches[4]}, accelerometer ${matches[5]}, ${shaperTitle}`,
		filename,
		shaperTitle,
		dampingFactor,
		lastModified,
	};
}

function pushIntoProfile(grouped: Array<Profile>, lastModified: string, runId: string, file: ProfileFile) {
	const title = `Profile #${runId}`;
	let run = grouped.find((p) => p.title === title);
	if (!run) {
		run = { icon: "mdi-run", title, subtitle: "", secondSubtitle: null, files: [], lastModified };
		grouped.push(run);
	}
	run.files.push(file);
}

function isProfileActive(profile: Profile): boolean {
	if (profile.files.length === 0) {
		return false;
	}
	return profile.files.every((file) => selection.value.includes(file.filename));
}

function toggleProfile(profile: Profile) {
	if (isProfileActive(profile)) {
		selection.value = [];
	} else {
		selection.value = profile.files.map((file) => file.filename);
	}
}

function toggleFile(filename: string) {
	if (selection.value.includes(filename)) {
		selection.value = selection.value.filter((f) => f !== filename);
	} else {
		selection.value = [...selection.value, filename];
	}
}

async function deleteProfile(profile: Profile) {
	progress.value = 0;
	progressMax.value = profile.files.length;
	try {
		for (const file of profile.files) {
			await machineStore.delete(Path.combine(Path.accelerometer, file.filename));
			progress.value++;
		}
	} finally {
		progress.value = 0;
		progressMax.value = 0;
	}
	emit("refresh");
}

async function deleteFile(filename: string) {
	progress.value = 0;
	progressMax.value = 1;
	try {
		await machineStore.delete(Path.combine(Path.accelerometer, filename));
	} finally {
		progress.value = 0;
		progressMax.value = 0;
	}
	emit("refresh");
}

async function getSamples(filename: string): Promise<AccelerometerDataset> {
	const csvFile = await machineStore.download({
		filename: Path.combine(Path.accelerometer, filename),
		type: "text",
	}, false, false, false);
	const dataset = parseAccelerometerCsv(csvFile as string);
	if (dataset.overflows > 0) {
		hadOverflowModel.value = true;
	}
	return dataset;
}

function toAxisValues(axes: string[], values: number[][]): Record<string, number[]> {
	return Object.fromEntries(axes.map((axis, index) => [axis, values[index]]));
}

async function update() {
	hadOverflowModel.value = false;
	if (selection.value.length === 0) {
		progress.value = 0;
		progressMax.value = 0;
		frequenciesModel.value = null;
		if (selectedFiles.value && selectedFiles.value.length > 0) {
			// Avoid the endless update loop that [] !== null would trigger
			selectedFiles.value = [];
		}
		valueModel.value = null;
		return;
	}

	progress.value = 0;
	if (individualFiles.value && showSamples.value) {
		progressMax.value = 1;
		try {
			const result = await getSamples(selection.value[0]);
			if (!arraysShallowEqual(selectedFiles.value ?? [], selection.value)) {
				selectedFiles.value = [...selection.value];
			}
			frequenciesModel.value = null;
			valueModel.value = toAxisValues(result.axes, result.samples);
		} finally {
			progress.value = 1;
		}
		return;
	}

	progressMax.value = selection.value.length + 1;
	try {
		const datasets: Array<AccelerometerDataset> = [];
		for (const filename of selection.value) {
			datasets.push(await getSamples(filename));
			progress.value++;
		}

		// Honor a previously selected sample window when only one file is being analysed
		if (datasets.length === 1 && typeof sampleStartIndex.value === "number" && typeof sampleEndIndex.value === "number") {
			for (const axisSamples of datasets[0].samples) {
				axisSamples.splice(sampleEndIndex.value + 1);
				axisSamples.splice(0, sampleStartIndex.value);
			}
		}

		const response = analyzeAccelerometerDatasets(datasets, wideBandModel.value);
		selectedFiles.value = [...selection.value];
		frequenciesModel.value = response.frequencies;
		valueModel.value = toAxisValues(datasets[0].axes, response.amplitudes);
	} finally {
		progress.value = progressMax.value;
	}
}

// Shallow-equal guard: defineModel writes back a fresh array each time, so an unconditional
// assignment would trigger watch(selection) -> update() -> reassign selectedFiles -> ... an
// infinite loop that ends up looking like the FileList's progress bar jittering forever
function arraysShallowEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}
watch(selectedFiles, (to) => {
	const next = to ?? [];
	if (!arraysShallowEqual(selection.value, next)) {
		selection.value = next;
	}
});

watch(estimateEffect, (to) => {
	showOriginalValuesModel.value = !to;
	estimateShaperEffectModel.value = to;
});

watch(individualFiles, (to) => {
	selection.value = [];
	if (!to) {
		showOriginalValuesModel.value = true;
	}
});

watch(selection, () => {
	update();
	sampleStartIndex.value = null;
	sampleEndIndex.value = null;
});

watch(showSamples, (to) => {
	update();
	if (!to) {
		showOriginalValuesModel.value = true;
	}
});

watch(wideBandModel, () => update());
</script>
