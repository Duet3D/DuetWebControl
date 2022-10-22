<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-texture</v-icon>
			{{ $t("panel.extrusionFactors.caption") }}

			<v-spacer />

			<v-menu offset-y right auto>
				<template #activator="{ on }">
					<a v-show="!uiFrozen && (extruders.length > 0)" v-on="on" href="javascript:void(0)"
					   class="subtitle-2">
						{{ $t("panel.extrusionFactors.changeVisibility") }}
					</a>
				</template>

				<v-list>
					<v-list-item v-for="(_, index) in extruders" :key="index"
								 @click.stop="toggleExtruderVisibility(index)">
						<v-icon class="mr-1">
							{{ displayedExtruders.includes(index) ? "mdi-checkbox-marked" : "mdi-checkbox-blank" }}
						</v-icon>
						{{ $t("panel.extrusionFactors.extruder", [index]) }}
					</v-list-item>
				</v-list>
			</v-menu>
		</v-card-title>

		<v-card-text v-if="hasVisibleExtruders" class="d-flex flex-column pb-0">
			<template v-for="(extruder, index) in extruders">
				<div v-if="displayedExtruders.includes(index)" :key="index" class="d-flex flex-column pt-2">
					<div class="d-inline-flex">
						{{ $t("panel.extrusionFactors.extruder", [index]) }}
						<v-spacer />
						<a v-show="extruder.factor !== 1" href="javascript:void(0)" :disabled="uiFrozen"
						   @click.prevent="setExtrusionFactor(index, 100)" class="subtitle-2">
							<v-icon small class="mr-1">mdi-backup-restore</v-icon>
							{{ $t("generic.reset") }}
						</a>
					</div>

					<percentage-input :value="getExtrusionFactor(extruder)" @input="setExtrusionFactor(index, $event)"
									  :max="getMax(extruder)" :step="1" :disabled="uiFrozen" />
				</div>
			</template>
		</v-card-text>

		<v-alert type="info" :value="!hasVisibleExtruders" class="mb-0">
			{{ $t("panel.extrusionFactors.noExtruders") }}
		</v-alert>
	</v-card>
</template>

<script lang="ts">
import { Extruder } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		displayedExtruders(): Array<number> {
			return store.state.machine.settings.displayedExtruders;
		},
		extruders(): Array<Extruder> {
			return store.state.machine.model.move.extruders;
		},
		hasVisibleExtruders(): boolean {
			return this.extruders.some((_, index) => this.displayedExtruders.includes(index));
		}
	},
	methods: {
		getMax(extruder: Extruder) { return Math.max(150, extruder.factor * 100 + 50); },
		getExtrusionFactor(extruder: Extruder) {
			return Math.round(extruder.factor * 100);
		},
		async setExtrusionFactor(extruderIndex: number, value: number) {
			await store.dispatch("machine/sendCode", `M221 D${extruderIndex} S${value}`);
		},
		toggleExtruderVisibility(extruderIndex: number) {
			store.commit("machine/settings/toggleExtruderVisibility", extruderIndex);
		}
	}
});
</script>
