<template>
	<v-card>
		<v-card-title>
			<span>Duet Web Control {{ version }}</span>
			<v-spacer></v-spacer>
			<a href="https://github.com/chrishamm/DuetWebControl" target="_blank">
				<v-icon small>mdi-star</v-icon> GitHub
			</a>
		</v-card-title>

		<v-card-text class="pt-0">
			{{ $t('panel.settingsAbout.developedBy') }} <a href="mailto:christian@duet3d.com">Christian Hammacher</a> {{ $t('panel.settingsAbout.for') }} <a href="https://www.duet3d.com" target="_blank">Duet3D</a>.
			<br>
			{{ $t('panel.settingsAbout.licensedUnder') }} <a href="https://www.gnu.org/licenses/gpl-3.0.en.html" target="_blank">GNU General Public License v3</a>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { version } from '../../../package.json'

export default {
	data() {
		return {
			version
		}
	}
}
</script>
