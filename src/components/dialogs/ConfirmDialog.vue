<template>
	<v-dialog v-model="internalShown" @keydown.escape="dismissed" persistent width="480">
		<v-card>
			<v-card-title>
				<span class="headline">
					{{ title }}
				</span>
			</v-card-title>

			<v-card-text>
				{{ prompt }}
			</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn color="blue darken-1" variant="text" @click="dismissed">
					{{ $t('generic.no') }}
				</v-btn>
				<v-btn color="blue darken-1" variant="text" @click="confirmed">
					{{ $t('generic.yes') }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
	props: {
		title: {
			type: String,
			required: true
		},
		prompt: {
			type: String,
			required: true
		},
		shown: {
			type: Boolean,
			required: true
		}
	},
	computed: {
		internalShown: {
			get(): boolean { return this.shown; },
			set(value: boolean) {
				if (value) {
					this.confirmed();
				} else {
					this.dismissed();
				}
			}
		}
	},
	methods: {
		confirmed() {
			this.$emit("confirmed");
			this.$emit("update:shown", false);
		},
		dismissed() {
			this.$emit("dismissed");
			this.$emit("update:shown", false);
		}
	}
});
</script>
