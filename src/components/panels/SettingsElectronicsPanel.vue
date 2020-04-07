<template>
	<v-card>
		<v-card-title>
			{{ $t('panel.settingsElectronics.caption') }}
			<v-spacer></v-spacer>
			<a v-show="isConnected" href="javascript:void(0)" @click="diagnostics">
				<v-icon small>mdi-lifebuoy</v-icon> {{ $t('panel.settingsElectronics.diagnostics') }}
			</a>
		</v-card-title>

		<v-card-text class="pt-0">
			<template v-if="isConnected">
				<template v-if="mainboard.name">
					{{ $t('panel.settingsElectronics.board', [mainboard.name + (mainboard.shortName ? ` (${mainboard.shortName})` : '')]) }} <br>
				</template>
				<template v-if="dsfVersion">
					{{ `DSF Version: ${dsfVersion}` }} <br>
				</template>
				<template v-if="mainboard.firmwareName">
					{{ $t('panel.settingsElectronics.firmware', [mainboard.firmwareName + ' ' + $display(mainboard.firmwareVersion), $display(mainboard.firmwareDate)]) }} <br>
				</template>
				<template v-if="firstInterface.firmwareVersion && firstInterface.type === 'wifi'">
					{{ $t('panel.settingsElectronics.dwsFirmware', [$display(firstInterface.firmwareVersion)]) }} <br>
				</template>
				<br>
				{{ $t('panel.settingsElectronics.updateNote') }}
			</template>
			<template v-else>
				(not connected)
			</template>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['isConnected']),
		...mapState('machine/model', {
			dsfVersion: state => state.state.dsfVersion,
			mainboard: state => (state.boards.length > 0) ? state.boards[0] : {},
			firstInterface: state => (state.network.interfaces.length > 0) ? state.network.interfaces[0] : {}
		})
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		async diagnostics() {
			await this.sendCode('M122');
			this.$router.push('/Console');
		}
	}
}
</script>
