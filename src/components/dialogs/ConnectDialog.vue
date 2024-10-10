<template>
	<v-dialog v-model="uiStore.showConnectDialog" persistent no-click-animation width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="submit">
				<v-card-title class="headline">
					{{ $t("dialog.connect.title") }}
				</v-card-title>

				<v-card-text>
					{{ $t("dialog.connect.prompt") }}

					<v-text-field v-show="!machineStore.passwordRequired" v-model="hostname"
								  :autofocus="!machineStore.passwordRequired"
								  :placeholder="$t('dialog.connect.hostPlaceholder')" :rules="hostnameRules" required class="mt-3" />
					<v-text-field type="password"
								  :placeholder="machineStore.passwordRequired ? $t('dialog.connect.passwordPlaceholder') : $t('dialog.connect.passwordPlaceholderOptional')"
								  v-model="password" :autofocus="machineStore.passwordRequired" :rules="passwordRules"
								  :required="machineStore.passwordRequired" />
					<v-checkbox v-model="rememberPassword" :label="$t('dialog.connect.rememberPassword')"
								hide-details class="mt-0" />
					<v-alert v-if="lastError" type="error" :text="lastError" class="mt-3" />
				</v-card-text>

				<v-card-actions>
					<v-btn :text="$t('dialog.connect.connect')" type="submit" class="mx-auto" />
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import i18n from "@/i18n";

import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { getErrorMessage } from "@/utils/errors";

import { getLocalSetting, removeLocalSetting, setLocalSetting } from "@/utils/localStorage";

const localStorageHostnameKey = "lastHostname", localStoragePasswordKey = "lastPassword";

const machineStore = useMachineStore(), uiStore = useUiStore();

// Form bindings

const form = ref<HTMLFormElement | null>(null);
const hostnameRules = [
	(value: string): string | boolean => value ? true : i18n.global.t("dialog.connect.hostRequired")
];

const passwordRules = [
	(value: string): string | boolean => (!value && machineStore.passwordRequired) ? i18n.global.t("dialog.connect.passwordRequired") : true
];

// Input values

const hostname = ref(getLocalSetting(localStorageHostnameKey, location.host));
const password = ref(getLocalSetting(localStoragePasswordKey, ""));
const rememberPassword = ref(false);

// Main action

const lastError = ref("");
async function submit() {
	if (uiStore.showConnectDialog && form.value?.validate()) {
		lastError.value = "";
		uiStore.showConnectDialog = false;
		try {
			await machineStore.connect(hostname.value, undefined, password.value);

			if (rememberPassword.value) {
				setLocalSetting(localStoragePasswordKey, password.value);
			} else {
				removeLocalSetting(localStoragePasswordKey);
			}
			password.value = "";
		} catch (e) {
			lastError.value = getErrorMessage(e);
			uiStore.showConnectDialog = true;
		}
	}
}

watch(() => uiStore.showConnectDialog, (to) => {
	if (to) {
		// Restore last-known password when the dialog is shown again
		password.value = getLocalSetting(localStoragePasswordKey);
	}
});
</script>