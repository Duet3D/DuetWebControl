<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">vertical_align_center</v-icon> Z Babystepping
		</v-card-title>

		<v-card-text class="pt-0">
			Current Offset: {{ $displayZ(babystepping) }}

			<v-layout row wrap>
				<v-flex>
					<code-btn :code="`M290 R1 Z${-babystepAmount}`" no-wait block class="px-0">
						<v-icon>vertical_align_bottom</v-icon> {{ $displayZ(-babystepAmount) }}
					</code-btn>
				</v-flex>

				<v-flex>
					<code-btn :code="`M290 R1 Z${babystepAmount}`" no-wait block class="px-0">
						<v-icon>vertical_align_top</v-icon> +{{ $displayZ(babystepAmount) }}
					</code-btn>
				</v-flex>
			</v-layout>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	computed: {
		...mapState('machine/model', {
			babystepping: state => state.move.babystepZ
		}),
		...mapState('machine/settings', ['babystepAmount'])
	}
}
</script>
