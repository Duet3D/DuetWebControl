<template>
	<v-row class="pa-3" :dense="$vuetify.breakpoint.mobile">
		<v-col cols="12" md="4" lg="4">
			<v-row :dense="$vuetify.breakpoint.mobile">
				<v-col cols="12" sm="12">
					<settings-about-panel />
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-apperance-panel />
				</v-col>
			</v-row>
		</v-col>

		<v-col cols="12" md="8">
			<v-row :dense="$vuetify.breakpoint.mobile">
				<v-col cols="12">
					<settings-general-panel />
				</v-col>
				<v-col cols="12">
					<settings-notifications-panel />
				</v-col>
				<v-col cols="12">
					<settings-webcam-panel />
				</v-col>
				<v-col cols="12">
					<settings-behaviour-panel />
				</v-col>
			</v-row>
		</v-col>
	</v-row>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({});
</script>
