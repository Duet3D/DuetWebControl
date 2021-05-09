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

			<v-btn v-show="!isFirmwareDirectory" class="hidden-sm-and-down mr-3" :disabled="uiFrozen" :elevation="1" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon> {{ $t('button.newFile.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" :elevation="1" @click="showNewDirectory = true">
				<v-icon class="mr-1">mdi-folder-plus</v-icon> {{ $t('button.newDirectory.caption') }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading" :disabled="uiFrozen" :elevation="1" @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
			<upload-btn ref="mainUpload" class="hidden-sm-and-down" :elevation="1" :directory="directory" :target="uploadTarget" color="primary" @uploadComplete="uploadComplete"></upload-btn>
		</v-toolbar>
		
		<base-file-list ref="filelist" v-model="selection" :directory.sync="directory" :loading.sync="loading" sort-table="sys" @fileClicked="fileClicked" @fileEdited="fileEdited" :noFilesText="noFilesText">
			<template #context-menu>
				<v-list-item v-show="isFirmwareFile" @click="installFile">
					<v-icon class="mr-1">mdi-update</v-icon> {{ $t('list.firmware.installFile') }}
				</v-list-item>
			</template>

			<template #file.config.json v-if="isSystemRootDirectory">
				<v-icon class="mr-1">mdi-wrench</v-icon> config.json
				<v-chip @click.stop="editConfigTemplate" class="pointer-cursor ml-2">
					<v-icon xs class="mr-1">mdi-open-in-new</v-icon> {{ $t('list.system.configToolNote') }}
				</v-chip>
			</template>
		</base-file-list>
		
		<v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition" class="hidden-md-and-up">
			<template #activator>
				<v-btn v-model="fab" dark color="primary" fab>
					<v-icon v-if="fab">mdi-close</v-icon>
					<v-icon v-else>mdi-dots-vertical</v-icon>
				</v-btn>
			</template>

			<v-btn v-show="!isFirmwareDirectory" fab :disabled="uiFrozen" @click="showNewFile = true">
				<v-icon class="mr-1">mdi-file-plus</v-icon>
			</v-btn>

			<v-btn fab :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon>mdi-folder-plus</v-icon>
			</v-btn>

			<v-btn fab color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>

			<v-btn fab color="primary" @click="clickUpload">
				<v-icon>mdi-cloud-upload</v-icon>
			</v-btn>
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
			boards: state => state.boards,
			firmwareDirectory: state => state.directories.firmware,
			menuDirectory: state => state.directories.menu,
			systemDirectory: state => state.directories.system,
			status: state => state.state.status
		}),
		...mapGetters(['uiFrozen']),
		isFirmwareDirectory() { return !this.isSystemDirectory && Path.startsWith(this.directory, this.firmwareDirectory); },
		isSystemDirectory() { return Path.startsWith(this.directory, this.systemDirectory) || Path.startsWith(this.directory, Path.system); },
		isSystemRootDirectory() { return Path.equals(this.directory, this.systemDirectory); },
		isFirmwareFile() {
			if (this.isFirmwareDirectory && (this.selection.length === 1) && !this.selection.isDirectory) {
				if ((/DuetWiFiSocketServer(.*)\.bin/i.test(this.selection[0].name) || /DuetWiFiServer(.*)\.bin/i.test(this.selection[0].name))) {
					return true;
				}
				if (/DuetWebControl(.*)\.bin/i.test(this.selection[0].name)) {
					return true;
				}
				if (/PanelDue(.*)\.bin/i.test(this.selection[0].name)) {
					return true;
				}
				return this.boards.some((board, index) => {
					if (board && board.firmwareFileName && (board.canAddress || index === 0)) {
						const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i');
						const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, '(.*)\\.uf2'), 'i');
						if (binRegEx.test(this.selection[0].name) || uf2RegEx.test(this.selection[0].name)) {
							return true;
						}
					}
					return false;
				}, this);
			}
			return false;
		},
		noFilesText() {
			if (Path.startsWith(this.directory, this.menuDirectory)) {
				return 'list.system.noFiles';
			}
			if (Path.startsWith(this.directory, this.systemDirectory) || Path.startsWith(this.directory, Path.system)) {
				return 'list.system.noFiles';
			}
			return 'list.firmware.noFiles';
		},
		uploadTarget() {
			if (this.isFirmwareDirectory) { return 'firmware'; }
			if (this.isSystemDirectory) { return 'system'; }
			return 'menu';
		}
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
		clickUpload() {
			this.$refs.mainUpload.chooseFile();
		},
		fileClicked(item) {
			if (item.name.toLowerCase().endsWith('.bin') || item.name.toLowerCase().endsWith('.uf2')) {
				this.$refs.filelist.download(item);
			} else {
				this.$refs.filelist.edit(item);
			}
		},
		fileEdited(filename) {
			const fullName = Path.combine(this.directory, filename);
			const configFile = Path.combine(this.systemDirectory, Path.configFile);
			if (!isPrinting(this.status) && (fullName === Path.configFile || fullName === configFile || fullName === Path.boardFile)) {
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
		async installFile() {
			let module = -1, board = -1;
			if ((/DuetWiFiSocketServer(.*)\.bin/i.test(this.selection[0].name) || /DuetWiFiServer(.*)\.bin/i.test(this.selection[0].name))) {
				module = 1;
			} else if (/DuetWebControl(.*)\.bin/i.test(this.selection[0].name)) {
				module = 2;
			} else if (/PanelDue(.*)\.bin/i.test(this.selection[0].name)) {
				module = 4;
			} else {
				this.boards.forEach((board, index) => {
					if (board && board.firmwareFileName && (board.canAddress || index === 0)) {
						const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i');
						const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, '(.*)\\.uf2'), 'i');
						if (binRegEx.test(this.selection[0].name) || uf2RegEx.test(this.selection[0].name)) {
							module = 0;
							board = board.canAddress || 0;
						}
					}
				}, this);
			}

			try {
				await this.sendCode(`M997${(board >= 0) ? (' B' + board) : ''} S${module} P"${Path.combine(this.directory, this.selection[0].name)}"`);
			} catch {
				// expected
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
			const configFile = Path.combine(this.systemDirectory, Path.configFile);
			for (let i = 0; i < files.length; i++) {
				const fullName = Path.combine(this.directory, files[i].name);
				if (!isPrinting(this.status) && (fullName === Path.configFile || fullName === configFile || fullName === Path.boardsFile)) {
					// Ask for firmware reset when config.g or 0:/sys/board.txt (RRF on LPC) has been replaced
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
