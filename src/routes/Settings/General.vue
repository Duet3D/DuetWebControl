<template>
	<v-layout row wrap>
		<v-flex md5 lg4>
			<v-layout row wrap>
				<v-flex xs12>
					<settings-about-panel></settings-about-panel>
				</v-flex>
				<v-flex sm6 md12>
					<settings-apperance-panel></settings-apperance-panel>
				</v-flex>
				<v-flex sm6 md12>
					<settings-notifications-panel></settings-notifications-panel>
				</v-flex>
			</v-layout>
		</v-flex>
		<v-flex md7 lg8>
			<v-layout column>
				<v-flex>
					<settings-general-panel></settings-general-panel>
				</v-flex>
				<v-flex>
					<settings-webcam-panel></settings-webcam-panel>
				</v-flex>
			</v-layout>
		</v-flex>
	</v-layout>
</template>
