import { RootState } from "@/store";
import { MachineModuleState } from "@/store/machine";
import ObjectModel from "@duet3d/objectmodel";

declare module "@/store" {
    export interface RootState {
        machine: MachineModuleState;
        machines: Record<string, MachineModuleState>;
        settings: SettingsState;
        uiInjection: UiInjectionState;
    }
}
