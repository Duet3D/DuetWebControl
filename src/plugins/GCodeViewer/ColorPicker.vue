<template>
	<v-row class="justify-center align-center">
		<v-col class="shrink" style="min-width: 220px;">
			<v-text-field v-model="internalTextColor" hide-details density="compact" variant="solo"
						  class="ma-0 pa-0" @blur="updateValue(internalTextColor)"
						  @keyup.enter="updateValue(internalTextColor)">
				<template #append>
					<v-menu v-model="menu" :close-on-content-click="false">
						<template #activator="{ props: activatorProps }">
							<div v-bind="activatorProps" :style="swatchStyle" />
						</template>
						<v-card>
							<v-card-text class="pa-0">
								<v-color-picker v-model="color" flat
												@update:model-value="(c) => updateValue(c as string)" />
							</v-card-text>
						</v-card>
					</v-menu>
				</template>
			</v-text-field>
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
const props = defineProps<{
	editcolor: string;
}>();

const emit = defineEmits<{
	updatecolor: [color: string];
}>();

const internalTextColor = ref("#000000");
const color = ref("#000000");
const menu = ref(false);

const swatchStyle = computed(() => ({
	backgroundColor: color.value,
	cursor: "pointer",
	height: "40px",
	width: "40px",
	borderRadius: menu.value ? "50%" : "4px",
	transition: "border-radius 200ms ease-in-out",
}));

function updateValue(val: string) {
	let next = val;
	if (!next.startsWith("#")) {
		next = "#" + next;
	}
	next = next.toUpperCase().padEnd(7, "0").substring(0, 7);
	color.value = next;
	internalTextColor.value = next;
	emit("updatecolor", next);
}

onMounted(() => {
	color.value = props.editcolor;
	internalTextColor.value = props.editcolor;
});

watch(() => props.editcolor, (newVal) => {
	color.value = newVal;
	internalTextColor.value = newVal;
});
</script>
