<template>
    <div>
        <v-tabs v-model="tab" class="elevation-2 mt-3">
            <v-tabs-slider></v-tabs-slider>

            <v-tab href="#integrated-plugins">
                {{ $t('tabs.plugins.integratedPlugins') }}
            </v-tab>
            <v-tab v-for="(machine, index) in connectedMachines" :key="index" :href="`#${machine}`">
                {{ (connectedMachines.length > 1) ? machines[machine].model.network.name : $t('tabs.plugins.externalPlugins') }}
            </v-tab>
            <upload-btn ref="mainUpload" v-show="connectedMachines.indexOf(tab) !== -1" class="align-self-center ml-auto mr-2 hidden-sm-and-down" :elevation="1" color="primary" :machine="tab" target="plugin"></upload-btn>

            <v-tab-item value="integrated-plugins">
                <plugins-integrated-tab></plugins-integrated-tab>
            </v-tab-item>
            <v-tab-item v-for="(machine, index) in connectedMachines" :key="index" :value="machine">
                <plugins-external-tab :machine="machines[machine]"></plugins-external-tab>
            </v-tab-item>
        </v-tabs>

        <v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition" :class="(connectedMachines.indexOf(tab) !== -1) ? 'hidden-md-and-up' : 'd-none'">
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

<script>
'use strict'

import { mapGetters, mapState } from 'vuex'

import { registerRoute } from '..'

export default {
    install() {
        // Register a route via Settings -> Plugins
        registerRoute(this, {
            Settings: {
                Plugins: {
                    icon: 'mdi-power-plug',
                    caption: 'menu.plugins.caption',
                    path: '/Plugins'
                }
            }
        });
    },

    computed: {
        ...mapGetters(['connectedMachines']),
        ...mapState(['machines'])
    },
    data() {
        return {
            tab: 'integrated-plugins',
			fab: false
        }
    },
    methods: {
        clickUpload() {
            this.$refs.mainUpload.chooseFile();
        }
    }
}
</script>
