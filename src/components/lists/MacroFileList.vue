<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" :elevation="1" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" :elevation="1" @click="showNewDirectory = true">
				<v-icon class="mr-1">mdi-folder-plus</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading" :disabled="uiFrozen" :elevation="1" @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :elevation="1" :directory="directory" target="macros" color="primary"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" sort-table="macros" @fileClicked="fileClicked" no-files-text="list.macro.noMacros">
			<template #context-menu>
				<v-list-item v-show="isFile" @click="runFile(selection[0].name)">
					<v-icon class="mr-1">mdi-play</v-icon> {{ $t('list.macro.run') }}
				</v-list-item>
			</template>
		</base-file-list>

		<v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition" class="hidden-md-and-up">
			<template #activator>
				<v-btn v-model="fab" dark color="primary" fab>
					<v-icon v-if="fab">mdi-close</v-icon>
					<v-icon v-else>mdi-dots-vertical</v-icon>
				</v-btn>
			</template>

			<v-btn fab :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon>
			</v-btn>

			<v-btn fab :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon>mdi-folder-plus</v-icon>
			</v-btn>

			<v-btn fab color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>

			<upload-btn fab dark :directory="directory" target="macros" color="primary">
				<v-icon>mdi-cloud-upload</v-icon>
			</upload-btn>
		</v-speed-dial>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<new-file-dialog :shown.sync="showNewFile" :directory="directory"></new-file-dialog>
		<confirm-dialog :shown.sync="runMacroDialog.shown" :title="runMacroDialog.title" :prompt="runMacroDialog.prompt" @confirmed="runFile(runMacroDialog.filename)"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import { mapGetters, mapState, mapActions } from 'vuex'

import Path, { escapeFilename } from '../../utils/path.js'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', {
			macrosDirectory: state => state.directories.macros
		}),
		isFile() { return (this.selection.length === 1) && !this.selection[0].isDirectory; }
	},
	data() {
		return {
			directory: Path.macros,
			loading: false,
			selection: [],
			runMacroDialog: {
				title: '',
				prompt: '',
				filename: '',
				shown: false
			},
			showNewDirectory: false,
			showNewFile: false,
			fab: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		refresh() {
			this.$refs.filelist.refresh();
		},
		fileClicked(item) {
			this.runMacroDialog.title = this.$t('dialog.runMacro.title', [item.name]);
			this.runMacroDialog.prompt = this.$t('dialog.runMacro.prompt', [item.name]);
			this.runMacroDialog.filename = item.name;
			this.runMacroDialog.shown = true;
		},
		runFile(filename) {
			this.sendCode(`M98 P"${escapeFilename(Path.combine(this.directory, filename))}"`);
		}
	},
	mounted() {
		this.directory = this.macrosDirectory;
	},
	watch: {
		macrosDirectory(to, from) {
			if (Path.equals(this.directory, from) || !Path.startsWith(this.directory, to)) {
				this.directory = to;
			}
		}
	}
}
</script>

