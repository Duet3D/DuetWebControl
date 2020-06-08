<style scoped>
.pointer-cursor {
	cursor: pointer;
}
</style>

<template>
	<div class="component">
		<v-toolbar>
			<directory-breadcrumbs v-model="directory"></directory-breadcrumbs>

			<v-spacer></v-spacer>

			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon class="mr-1">mdi-folder-plus</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :directory="directory" target="system" color="primary" @uploadComplete="uploadComplete"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" sort-table="sys" @fileClicked="fileClicked" @fileEdited="fileEdited" no-files-text="list.system.noFiles">
			<template #file.config.json v-if="isRootDirectory">
				<v-icon class="mr-1">mdi-wrench</v-icon> config.json
				<v-chip @click.stop="editConfigTemplate" class="pointer-cursor ml-2"><v-icon xs class="mr-1">mdi-open-in-new</v-icon> {{ $t('list.system.configToolNote') }}</v-chip>
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

			<upload-btn fab dark :directory="directory" target="system" color="primary" @uploadComplete="uploadComplete">
				<v-icon>mdi-cloud-upload</v-icon>
			</upload-btn>
		</v-speed-dial>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory"></new-directory-dialog>
		<new-file-dialog :shown.sync="showNewFile" :directory="directory"></new-file-dialog>
		<confirm-dialog :shown.sync="showResetPrompt" :title="$t('dialog.configUpdated.title')" :prompt="$t('dialog.configUpdated.prompt')" @confirmed="resetBoard"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

import { isPrinting } from '../../store/machine/modelEnums.js'
import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState('machine/model', {
			systemDirectory: state => state.directories.system,
			status: state => state.state.status
		}),
		...mapGetters(['uiFrozen']),
		isRootDirectory() { return Path.equals(this.directory, this.systemDirectory); }
	},
	data() {
		return {
			directory: Path.system,
			loading: false,
			selection: [],
			showNewDirectory: false,
			showNewFile: false,
			showResetPrompt: false,
			fab: false
		}
	},
	methods: {
		...mapActions('machine', ['download', 'sendCode']),
		refresh() {
			this.$refs.filelist.refresh();
		},
		fileClicked(item) {
			if (item.name.toLowerCase().endsWith('.bin')) {
				this.$refs.filelist.download(item);
			} else {
				this.$refs.filelist.edit(item);
			}
		},
		fileEdited(filename) {
			if (!isPrinting(this.status) &&
				(Path.equals(filename, Path.combine(this.systemDirectory, Path.configFile)) || Path.equals(filename, '0:/sys/board.txt'))) {
				// Ask for firmware reset when config.g or 0:/sys/board.txt (RRF on LPC) has been edited
				this.showResetPrompt = true;
			}
		},
		async resetBoard() {
			try {
				await this.sendCode({ code: 'M999', log: false });
			} catch (e) {
				// this is expected
			}
		},
		async editConfigTemplate() {
			const jsonTemplate = await this.download({ filename: Path.combine(this.systemDirectory, 'config.json'), type: 'text' });

			const form = document.createElement('form');
			form.method = 'POST';
			form.action = 'https://configtool.reprapfirmware.org/load.php';
			form.target = '_blank';
			{
				const jsonTemplateInput = document.createElement('textarea');
				jsonTemplateInput.name = 'json';
				jsonTemplateInput.value = jsonTemplate;
				form.appendChild(jsonTemplateInput);
			}
			document.body.appendChild(form);
			form.submit();
			document.body.removeChild(form);
		},
		uploadComplete(files) {
			for (let i = 0; i < files.length; i++) {
				if (files[i].name === Path.configFile) {
					this.showResetPrompt = true;
					break;
				}
			}
		}
	},
	mounted() {
		this.directory = this.systemDirectory;
	},
	watch: {
		systemDirectory(to, from) {
			if (Path.equals(this.directory, from) || Path.getVolume(from) !== Path.getVolume(to)) {
				this.directory = to;
			}
		}
	}
}
</script>
