<template>
    <v-row>
        <v-col cols="12" class="pt-0 pb-0">
            <cnc-movement-panel class="mb-2"></cnc-movement-panel>
        </v-col>
        <v-col cols="12" md="9">
            <v-row dense>
                <v-col cols="12">
                    <spindle-speed-panel></spindle-speed-panel>
                </v-col>
                <v-col cols="12">
                    <v-card>
                        <v-card-text>
                            <job-progress></job-progress>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="4" class="flex-grow-1">
                    <job-control-panel></job-control-panel>
                </v-col>
                <v-col cols="4" class="flex-grow-1">
                    <z-babystep-panel class="fill-height"></z-babystep-panel>
                </v-col>
                <v-col cols="4" class="flex-grow-1">
                    <speed-factor-panel class="fill-height"></speed-factor-panel>
                </v-col>
            </v-row>
        </v-col>
        <v-col cols="12" md="3">
            <v-row dense>
                <macro-list class="macro"></macro-list>
            </v-row>
        </v-col>
    </v-row>
</template>

<style scoped>
.macro {
    width: 100%;
}
</style>

<script>
'use strict'

export default {}
</script>
