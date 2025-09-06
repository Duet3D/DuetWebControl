<template>
    <div>
        <v-menu offset-y left :disabled="uiFrozen">
            <template #activator="{ on }">
                <v-btn v-show="visibleAxes.length" color="primary" block class="mx-0 move-btn" v-on="on" :disabled="uiFrozen">
                    {{ $t("panel.movement.compensation") }}
                    <v-icon>mdi-menu-down</v-icon>
                </v-btn>
            </template>

            <v-card>
                <v-list>
                    <div v-show="isCompensationEnabled">
                        <v-list-item>
                            <v-spacer />
                            {{ $t("panel.movement.compensationInUse", [compensationType]) }}
                            <v-spacer />
                        </v-list-item>

                        <v-divider />
                    </div>

                    <v-list-item @click="sendCode('G32')">
                        <v-icon class="mr-1">mdi-format-vertical-align-center</v-icon>
                        {{ $t(isDelta ? "panel.movement.runDelta" : "panel.movement.runBed") }}
                    </v-list-item>
                    <v-list-item :disabled="!isCompensationEnabled" @click="sendCode('M561')">
                        <v-icon class="mr-1">mdi-border-none</v-icon>
                        {{ $t("panel.movement.disableBedCompensation") }}
                    </v-list-item>

                    <v-divider />

                    <v-list-item @click="sendCode('G29')">
                        <v-icon class="mr-1">mdi-grid</v-icon>
                        {{ $t("panel.movement.runMesh") }}
                    </v-list-item>
                    <v-list-item @click="showMeshEditDialog = true">
                        <v-icon class="mr-1">mdi-pencil</v-icon>
                        {{ $t("panel.movement.editMesh") }}
                    </v-list-item>
                    <v-list-item @click="sendCode('G29 S1')">
                        <v-icon class="mr-1">mdi-content-save</v-icon>
                        {{ $t("panel.movement.loadMesh") }}
                    </v-list-item>
                    <v-list-item :disabled="!isCompensationEnabled" @click="sendCode('G29 S2')">
                        <v-icon class="mr-1">mdi-grid-off</v-icon>
                        {{ $t("panel.movement.disableMeshCompensation") }}
                    </v-list-item>
                </v-list>
            </v-card>
        </v-menu>
        <mesh-edit-dialog :shown.sync="showMeshEditDialog" />
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Axis, KinematicsName, MoveCompensationType } from "@duet3d/objectmodel";
import store from "@/store";

interface CompensationMenuData {
  showMeshEditDialog: boolean;
}

export default Vue.extend({
  data(): CompensationMenuData {
    return {
      showMeshEditDialog: false,
    };
  },
  computed: {
    uiFrozen(): boolean {
      return store.getters["uiFrozen"];
    },
    isCompensationEnabled(): boolean {
      return store.state.machine.model.move.compensation.type !== MoveCompensationType.none;
    },
    compensationType(): MoveCompensationType {
      return store.state.machine.model.move.compensation.type;
    },
    visibleAxes(): Axis[] {
      return store.state.machine.model.move.axes.filter((axis: Axis) => axis.visible);
    },
    isDelta(): boolean {
      return [KinematicsName.delta, KinematicsName.rotaryDelta].includes(store.state.machine.model.move.kinematics.name);
    },
  },
  methods: {
    async sendCode(code: string): Promise<void> {
      await store.dispatch("machine/sendCode", code);
    },
  },
  watch: {
    isConnected() {
      // Hide dialogs when the connection is interrupted
      this.showMeshEditDialog = false;
    },
  },
});
</script>
