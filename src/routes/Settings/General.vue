<template>
	<v-row>
		<v-col cols="12" md="4" lg="4" class="pt-0">
			<v-row>
				<v-col cols="12" sm="12">
					<settings-about-panel></settings-about-panel>
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-apperance-panel></settings-apperance-panel>
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-notifications-panel></settings-notifications-panel>
				</v-col>
			</v-row>
		</v-col>

		<v-col cols="12" md="8" class="pt-0">
			<v-row>
				<v-col cols="12">
					<settings-general-panel></settings-general-panel>
				</v-col>
				<v-col cols="12">
					<settings-webcam-panel></settings-webcam-panel>
				</v-col>
			</v-row>
		</v-col>
	</v-row>
</template>
