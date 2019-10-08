<template>
	<v-layout row wrap>
		<v-flex md6 lg4>
			<v-layout row wrap>
				<v-flex sm6 md12>
					<settings-electronics-panel></settings-electronics-panel>
				</v-flex>
				<v-flex sm6 md12>
					<settings-machine-panel></settings-machine-panel>
				</v-flex>
				<v-flex>
					<settings-communication-panel></settings-communication-panel>
				</v-flex>
			</v-layout>
		</v-flex>
		<v-flex md6 lg8>
			<v-layout row wrap>
				<v-flex sm9 md12 lg9>
					<settings-list-items-panel></settings-list-items-panel>
				</v-flex>
				<v-flex sm3 md12 lg3>
					<settings-endstops-panel></settings-endstops-panel>
				</v-flex>
			</v-layout>
		</v-flex>
	</v-layout>
</template>
