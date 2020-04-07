<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">mdi-format-vertical-align-center</v-icon> {{ $t('panel.babystepping.caption') }}
		</v-card-title>

		<v-card-text class="pt-0">
			{{ $t('panel.babystepping.current', [$displayZ(babystepping)]) }}

			<v-row no-gutters class="mt-1">
				<v-col>
					<code-btn :code="`M290 R1 Z${-babystepAmount}`" no-wait block>
						<v-icon>mdi-arrow-collapse-vertical</v-icon> {{ $displayZ(-babystepAmount) }}
					</code-btn>
				</v-col>

				<v-col>
					<code-btn :code="`M290 R1 Z${babystepAmount}`" no-wait block>
						<v-icon>mdi-arrow-split-horizontal</v-icon> +{{ $displayZ(babystepAmount) }}
					</code-btn>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	computed: {
		...mapState('machine/model', {
			babystepping: state => (state.move.axes.length >= 3) ? state.move.axes[2].babystep : 0
		}),
		...mapState('machine/settings', ['babystepAmount'])
	}
}
</script>
