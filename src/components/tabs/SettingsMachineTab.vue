<template>
	<v-row class="pa-3" :dense="$vuetify.display.mobile">
		<v-col cols="12" md="4">
			<v-row :dense="$vuetify.display.mobile">
				<v-col cols="12" md="12">
					<settings-electronics-panel />
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-machine-panel />
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-communication-panel />
				</v-col>
			</v-row>
		</v-col>

		<v-col cols="12" md="8">
			<settings-list-items-panel />
		</v-col>
	</v-row>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({});
</script>
