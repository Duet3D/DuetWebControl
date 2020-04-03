<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">mdi-polymer</v-icon> {{ $t('list.macro.caption') }}
			<v-spacer></v-spacer>
			<span v-show="isConnected" class="subtitle-2">{{ directory.replace(macrosDirectory, $t('list.macro.root')) }}</span>
		</v-card-title>

		<v-card-text class="pa-0" v-show="loading || filelist.length || !isRootDirectory">
			<v-progress-linear v-show="loading" :indeterminate="true" class="my-0"></v-progress-linear>

			<v-list class="pt-0" dense>
				<v-list-item v-if="!isRootDirectory" @click="goUp">
					<v-list-item-avatar>
						<v-icon class="list-icon mr-1 grey lighten-1 white--text">mdi-arrow-up</v-icon>
					</v-list-item-avatar>

					<v-list-item-content>
						<v-list-item-title>{{ $t('list.baseFileList.goUp') }}</v-list-item-title>
					</v-list-item-content>
				</v-list-item>

				<v-list-item v-for="item in filelist" :key="item.name" @click="itemClick(item)">
					<v-list-item-avatar>
						<v-icon class="mr-1" :class="item.isDirectory ? 'grey lighten-1 white--text' : 'blue white--text'">
							{{ item.isDirectory ? 'mdi-folder' : 'mdi-file' }}
						</v-icon>
					</v-list-item-avatar>

					<v-list-item-content>
						<v-list-item-title>{{ item.displayName }}</v-list-item-title>
					</v-list-item-content>

					<v-list-item-action v-if="!item.isDirectory && item.executing">
						<v-progress-circular class="list-icon" indeterminate color="blue"></v-progress-circular>
					</v-list-item-action>
				</v-list-item>
			</v-list>
		</v-card-text>

		<v-alert :value="!filelist.length" type="info">
			{{ $t('list.macro.noMacros') }}
		</v-alert>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

import { getModifiedDirectories } from '../../store/machine'
import { DisconnectedError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected', 'uiFrozen']),
		...mapState('machine/model', {
			macrosDirectory: state => state.directories.macros,
			volumes: state => state.volumes
		}),
		isRootDirectory() { return Path.equals(this.directory, this.macrosDirectory); }
	},
	data () {
		return {
			unsubscribe: undefined,
			loading: false,
			wasMounted: false,
			directory: Path.macros,
			filelist: []
		}
	},
	methods: {
		...mapActions('machine', ['sendCode', 'getFileList']),
		async loadDirectory(directory) {
			if (this.loading) {
				return;
			}

			this.loading = true;
			try {
				const files = await this.getFileList(directory);
				files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensivity: 'base' }));
				files.sort((a, b) => (a.isDirectory === b.isDirectory) ? 0 : (a.isDirectory ? -1 : 1));
				files.forEach(function(item) {
					item.displayName = Path.stripMacroFilename(item.name);
					item.executing = false;
				});

				this.directory = directory;
				this.filelist = files;
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					this.$log('error', this.$t('error.filelistRequestFailed'), e.message);
				}
			}
			this.loading = false;
		},
		async refresh() {
			await this.loadDirectory(this.directory);
		},
		async itemClick(item) {
			if (this.uiFrozen) {
				return;
			}

			const filename = Path.combine(this.directory, item.name);
			if (item.isDirectory) {
				await this.loadDirectory(filename);
			} else if (!item.executing) {
				item.executing = true;
				try {
					await this.sendCode(`M98 P"${filename}"`);
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						console.warn(e);
					}
				}
				item.executing = false;
			}
		},
		async goUp() {
			await this.loadDirectory(Path.extractDirectory(this.directory));
		}
	},
	mounted() {
		// Perform initial load
		this.directory = this.macrosDirectory;
		if (this.isConnected) {
			this.wasMounted = (this.volumes.length > 0) && this.volumes[0].mounted;
			this.refresh();
		}

		// Keep track of file changes
		const that = this;
		this.unsubscribe = this.$store.subscribeAction(async function(action, state) {
			if (getModifiedDirectories(action, state).some(directory => Path.equals(directory, that.directory))) {
				// Refresh the list when a file or directory has been changed
				await that.refresh();
			}
		});
	},
	beforeDestroy() {
		this.unsubscribe();
	},
	watch: {
		macrosDirectory(to, from) {
			if (Path.equals(this.directory, from) || !Path.startsWith(this.directory, to)) {
				this.directory = to;
			}
		},
		isConnected(to) {
			if (to) {
				this.wasMounted = (this.volumes.length > 0) && this.volumes[0].mounted;
				this.refresh();
			} else {
				this.directory = Path.macros;
				this.filelist = [];
			}
		},
		selectedMachine() {
			// TODO store current directory per selected machine
			if (this.isConnected) {
				this.wasMounted = (this.volumes.length > 0) && this.volumes[0].mounted;
				this.refresh();
			} else {
				this.directory = Path.macros;
				this.filelist = [];
			}
		},
		volumes: {
			deep: true,
			handler() {
				if (this.isConnected) {
					const volume = Path.getVolume(this.directory);
					if (volume >= 0 && volume < this.volumes.length) {
						const mounted = this.volumes[volume].mounted;
						if (this.wasMounted !== mounted) {
							this.wasMounted = mounted;
							this.refresh();
						}
					} else {
						this.wasMounted = false;
						this.refresh();
					}
				}
			}
		}
	}
}
</script>
