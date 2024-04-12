import { BaseConnector, ConnectorCallbacks } from "@duet3d/connectors";
import ObjectModel from "@duet3d/objectmodel";
import { Commit, Dispatch } from "vuex";

import Root from "@/main";
import Events from "@/utils/events";
import { closeNotifications } from "@/utils/notifications";

export default class MachineCallbacks implements ConnectorCallbacks {
    /**
     * Hostname of the connected machine
     */
    private hostname: string;

    /**
     * Global Vuex commit method
     */
    private commit: Commit;

    /**
     * Global Vuex dispatch method
     */
    private dispatch: Dispatch;

    /**
     * Constructor of this class
     * @param hostname Hostname of the connected machine
     * @param commit Global Vuex commit method
     * @param dispatch Global Vuex dispatch method
     */
    constructor(hostname: string, commit: Commit, dispatch: Dispatch) {
        this.hostname = hostname;
        this.commit = commit;
        this.dispatch = dispatch;
    }

    /**
     * Initial object model to set when a connection has been established
     */
    private initialModel: ObjectModel | null = new ObjectModel();

    /**
     * Called when the Vuex module has been registered
     */
    machineAdded() {
        this.dispatch(`machines/${this.hostname}/update`, this.initialModel);
        this.initialModel = null;
    }

    /**
     * Called to report the progress while establishing a connection
     * @param connector Connector instance
     * @param progress Connection progress in percent (0..100) or -1 when the connect process has finished
     * @returns
     */
    onConnectProgress(connector: BaseConnector, progress: number) {
        this.commit(`machines/${this.hostname}/setConnectingProgress`, progress);
    }

    /**
     * Called to let the callee load settings from the machine being connected.
     * This is called before connector.connect() returns the final connector instrance and before the connector starts its update loop
     * @param connector Connector instance
     */
    async onLoadSettings(connector: BaseConnector) {
        // Not supported in v3.6, settings are loaded after the connector has been created
    }

    /**
     * Connection has been lost
     * The callee may attempt to reconnect in given intervals by calling connector.reconnect()
     * @param connector Connector instance
     * @param reason Reason for the connection loss
     */
    async onConnectionError(connector: BaseConnector, reason: unknown) {
        await this.dispatch(`machines/${this.hostname}/onConnectionError`, reason);
    }

    /**
     * Connector has established a connection again
     * @param connector Connector instance
     */
    onReconnected(connector: BaseConnector) {
        closeNotifications(true);
    }

    /***
     * Object model update has been received
     * The received data can be patched into the object model instance via omInstance.update(data)
     * Note that this is called before the final connector instance is returned!
     */
    onUpdate(connector: BaseConnector, data: any) {
        if (this.initialModel === null) {
            this.dispatch(`machines/${this.hostname}/update`, data);
        } else {
            this.initialModel.update(data);
        }
    }
    
    /**
     * Files or directories have been changed on the given volume
     * @param connector Connector instance
     * @param volumeIndex Index of the volume where files or directories have been changed
     */
    onVolumeChanged(connector: BaseConnector, volumeIndex: number) {
        Root.$emit(Events.filesOrDirectoriesChanged, {
            machine: this.hostname,
            volume: volumeIndex
        });
    }
}
