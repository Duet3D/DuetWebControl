<template>
	<v-card outlined>
		<v-card-title>
			<span :title="$t('panel.settingsAbout.buildDateTime', [buildDateTime])">
				{{ prettyName }} {{ version }}
			</span>
			<v-spacer />
			<a href="https://github.com/Duet3D/DuetWebControl" target="_blank">
				<v-icon small>mdi-star</v-icon> GitHub
			</a>
		</v-card-title>

		<v-card-text class="pt-0">
			<i18n path="panel.settingsAbout.credits">
				<template #author>
					<a href="mailto:christian@duet3d.com">
						Christian Hammacher
					</a>
				</template>
				<template #Duet3D>
					<a href="https://www.duet3d.com" target="_blank">
						Duet3D
					</a>
				</template>
			</i18n>

			<br>

			<i18n path="panel.settingsAbout.license">
				<template #gpl>
					<a href="https://www.gnu.org/licenses/gpl-3.0.en.html" target="_blank">
						GNU General Public License v3
					</a>
				</template>
			</i18n>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import packageInfo from "../../../package.json";

export default Vue.extend({
	data() {
		return {
			buildDateTime: process.env.BUILD_DATETIME,
			prettyName: packageInfo.prettyName,
			version: packageInfo.version
		}
	}
});
</script>
