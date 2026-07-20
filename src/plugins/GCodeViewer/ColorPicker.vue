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

// Values arriving from a setting may be empty or too short; without this the swatch renders blank
// until the field is focused and blurred, which is what used to "fix" it
function normalizeColor(value: string): string {
	const next = value.startsWith("#") ? value : `#${value}`;
	return next.toUpperCase().padEnd(7, "0").substring(0, 7);
}

function updateValue(val: string) {
	const next = normalizeColor(val);
	color.value = next;
	internalTextColor.value = next;
	emit("updatecolor", next);
}

function applyEditColor(value: string) {
	color.value = normalizeColor(value);
	internalTextColor.value = color.value;
}

onMounted(() => applyEditColor(props.editcolor));

watch(() => props.editcolor, (newVal) => applyEditColor(newVal));
</script>
