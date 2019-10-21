<template>
	<v-row>
		<v-col cols="12" md="4" class="pt-0">
			<v-row>
				<v-col cols="12" md="12">
					<settings-electronics-panel></settings-electronics-panel>
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-machine-panel></settings-machine-panel>
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-communication-panel></settings-communication-panel>
				</v-col>
			</v-row>
		</v-col>

		<v-col cols="12" md="8" class="pt-0">
			<v-row>
				<v-col cols="12" lg="9">
					<settings-list-items-panel></settings-list-items-panel>
				</v-col>
				<v-col cols="12" lg="3">
					<settings-endstops-panel></settings-endstops-panel>
				</v-col>
			</v-row>
		</v-col>
	</v-row>
</template>
