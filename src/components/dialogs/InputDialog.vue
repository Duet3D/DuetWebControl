<template>
	<v-dialog v-model="shown" persistent no-click-animation width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="submit">
				<v-card-title>
					<span class="headline">
						{{ title }}
					</span>
				</v-card-title>

				<v-card-text>
					{{ prompt }}

					<v-text-field v-model="input" :rules="inputRules" required autofocus />
				</v-card-text>

				<v-card-actions>
					<v-spacer></v-spacer>
					<v-btn color="blue darken-1" text @click="hide">
						{{ $t("generic.cancel") }}
					</v-btn>
					<v-btn color="blue darken-1" text type="submit">
						{{ $t("generic.ok") }}
					</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		title: {
			type: String,
			required: true
		},
		prompt: {
			type: String,
			required: true
		},
		isNumericValue: Boolean,
		preset: [String, Number]
	},
	data() {
		return {
			input: "",
			inputRules: [
				(v: string) => !v ? this.$t("dialog.inputRequired") : true,
				(v: string) => !this.isNumericValue || isFinite(parseFloat(v)) || this.$t("dialog.numberRequired")
			]
		}
	},
	methods: {
		async submit() {
			if ((this.$refs.form as HTMLFormElement).validate()) {
				this.$emit("update:shown", false);
				this.$emit("confirmed", this.isNumericValue ? parseFloat(this.input) : this.input);
			}
		},
		hide() {
			this.$emit("update:shown", false);
			this.$emit("cancelled");
		}
	},
	watch: {
		shown(to: boolean) {
			if (to) {
				// Apply preset
				this.input = this.preset.toString();
			}
		}
	}
});
</script>
