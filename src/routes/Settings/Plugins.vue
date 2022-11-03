<template>
    <div>
        <v-tabs v-model="tab" class="elevation-2 mt-3">
            <v-tabs-slider />

            <v-tab href="#integrated-plugins">
                {{ $t('tabs.plugins.integratedPlugins') }}
            </v-tab>
            <v-tab v-for="(machine, index) in connectedMachines" :key="index" :href="`#${machine}`">
                {{ (connectedMachines.length > 1) ? machines[machine].model.network.name : $t('tabs.plugins.externalPlugins') }}
            </v-tab>
            <upload-btn ref="mainUpload" v-show="connectedMachines.indexOf(tab) !== -1"
                        class="align-self-center ml-auto mr-2 hidden-sm-and-down" :elevation="1" color="primary"
                        :machine="tab" target="plugin" />

            <v-tab-item value="integrated-plugins">
                <plugins-integrated-tab />
            </v-tab-item>
            <v-tab-item v-for="(machine, index) in connectedMachines" :key="index" :value="machine">
                <plugins-external-tab :machine="machines[machine]" />
            </v-tab-item>
        </v-tabs>

        <v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition"
                      :class="(connectedMachines.indexOf(tab) !== -1) ? 'hidden-md-and-up' : 'd-none'">
            <template #activator>
                <v-btn v-model="fab" dark color="primary" fab>
                    <v-icon v-if="fab">mdi-close</v-icon>
                    <v-icon v-else>mdi-dots-vertical</v-icon>
                </v-btn>
            </template>

            <v-btn fab color="primary" @click="clickUpload">
                <v-icon>mdi-cloud-upload</v-icon>
            </v-btn>
        </v-speed-dial>
    </div>
</template>

<script lang="ts">
import Vue from "vue";

import UploadBtn from "@/components/buttons/UploadBtn.vue";
import store from "@/store";
import type { MachineModuleState } from "@/store/machine";

export default Vue.extend({
    computed: {
        connectedMachines(): Array<string> { return store.getters["connectedMachines"]; },
        machines(): Record<string, MachineModuleState> { return store.state.machines; }
    },
    data() {
        return {
            tab: "integrated-plugins",
            fab: false
        }
    },
    methods: {
        clickUpload() {
            (this.$refs.mainUpload as any).chooseFile();
        }
    }
});
</script>
