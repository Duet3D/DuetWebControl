<template>
	<v-layout row wrap>
		<v-flex md5 lg4>
			<v-layout row wrap>
				<v-flex sm6 md12>
					<settings-electronics-panel></settings-electronics-panel>
				</v-flex>
				<v-flex sm6 md12>
					<settings-machine-panel></settings-machine-panel>
				</v-flex>
			</v-layout>
		</v-flex>
		<v-flex md7 lg8>
			<v-layout row wrap>
				<v-flex>
					<settings-communication-panel></settings-communication-panel>
				</v-flex>
				<v-flex>
					<settings-list-items-panel></settings-list-items-panel>
				</v-flex>
			</v-layout>
		</v-flex>
	</v-layout>
</template>
