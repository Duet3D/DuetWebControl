<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">info</v-icon> About
		</v-card-title>

		<v-card-text class="pt-0">
			Duet Web Control 2.0.0-RC2 {{ electronics.firmware.version ? `/ RepRapFirmware ${electronics.firmware.version}` : '' }}
			<br/><br/>
			Web Interface developed by <a href="mailto:chr.hammacher@gmail.com">Christian Hammacher</a> for <a href="https://www.duet3d.com" target="_blank">Duet3D</a>
			<br/>
			Licensed under the terms of the <a href="https://www.gnu.org/licenses/gpl-3.0.en.html" target="_blank">GNU General Public License v3</a>
			<br/>
			Stay tuned for <a href="https://github.com/chrishamm/DuetWebControl/tree/next" target="_blank">updates</a>!
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	computed: mapState('machine/model', ['electronics'])
}
</script>
