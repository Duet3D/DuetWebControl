<template>
	<v-dialog v-model="shown" persistent width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="rename">
				<v-card-title>
					<span class="headline">Rename {{ filename }}</span>
				</v-card-title>

				<v-card-text>
					Please enter a new filename:
					<v-text-field ref="hostname" v-model="innerFilename" :rules="[v => !!v || $t('dialog.rename.filenameRequired')]" required></v-text-field>
				</v-card-text>

				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn color="blue darken-1" flat @click="hide">{{ $t('generic.cancel') }}</v-btn>
					<v-btn color="blue darken-1" flat type="submit">{{ $t('generic.ok') }}</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapActions } from 'vuex'

import Path from '../../utils/path.js'

export default {
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		filename: {
			type: String,
			required: true
		},
		directory: {
			type: String,
			required: true
		}
	},
	data() {
		return {
			innerFilename: ''
		}
	},
	methods: {
		...mapActions('machine', ['move']),
		async rename() {
			if (this.$refs.form.validate()) {
				this.hide();
				try {
					await this.move({
						from: Path.combine(this.directory, this.filename),
						to: Path.combine(this.directory, this.innerFilename)
					});
				} catch (e) {
					console.warn(e);
					this.$log('error', `Failed to rename ${this.filename} to ${this.innerFilename}`, e.message);
				}
			}
		},
		hide() {
			this.$emit("update:shown", false);
		}
	},
	watch: {
		shown(to) {
			if (to) {
				// Auto-focus filename input
				const input = this.$refs.hostname;
				setTimeout(function() { input.focus(); }, 100);
			}
		},
		filename(to) {
			this.innerFilename = to;
		}
	}
}
</script>
