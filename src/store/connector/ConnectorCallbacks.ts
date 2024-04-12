import BaseConnector from "./BaseConnector";

/**
 * Class holding possible callbacks for the connector
 */
export default interface ConnectorCallbacks {
    /**
     * Called to report the progress while establishing a connection
     * @param connector Connector instance
     * @param progress Connection progress in percent (0..100) or -1 when the connect process has finished
     * @returns 
     */
    onConnectProgress: (connector: BaseConnector, progress: number) => void;

    /**
     * Called to let the callee load settings from the machine being connected.
     * This is called before connector.connect() returns the final connector instrance and before the connector starts its update loop
     * @param connector Connector instance
     */
    onLoadSettings: (connector: BaseConnector) => Promise<void> | void;

    /**
     * Connection has been lost
     * The callee may attempt to reconnect in given intervals by calling connector.reconnect()
     * @param connector Connector instance
     * @param reason Reason for the connection loss
     */
    onConnectionError: (connector: BaseConnector, reason: unknown) => void;

    /**
     * Connector has established a connection again
     * @param connector Connector instance
     */
    onReconnected: (connector: BaseConnector) => void;

    /***
     * Object model update has been received
     * The received data can be patched into the object model instance via omInstance.update(data)
     * Note that this is called before the final connector instance is returned!
     */
    onUpdate: (connector: BaseConnector, data: any) => void;

    /**
     * Files or directories have been changed on the given volume
     * @param connector Connector instance
     * @param volumeIndex Index of the volume where files or directories have been changed
     */
    onVolumeChanged: (connector: BaseConnector, volumeIndex: number) => void;
}
