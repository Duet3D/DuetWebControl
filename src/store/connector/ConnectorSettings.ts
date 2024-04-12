/**
 * General connector settings
 */
export default interface ConnectorSettings {
    /**
     * Username for authorization (currently unused)
     */
    username: string;

    /**
     * Password for authorization
     */
    password: string;

    /**
     * Number of retries for HTTP requests (in ms)
     * Note that increasing the number of retries decreases the timeout for each HTTP request due to the predefined session timeout
     */
    maxRetries: number;

    /**
     * Store of the model.plugins[] content or null if plugin functionality is disabled
     * This is only used by the PollConnector in standalone mode. In SBC mode, the object model already provides plugins[] as part of the object model 
     */
    pluginsFile: string | null;

    /**
     * Do not send file timestamps to the server
     */
    ignoreFileTimestamps: boolean;

    //#region PollConnector settings

    /**
     * Compute CRC32 checksums for file uploads
     * This is only used by the PollConnector
     */
    crcUploads: boolean;

    /*
     * Maximum threshold of HTTP request data lengths for automatic retries on error (in bytes)
     */
    fileTransferRetryThreshold: number;

    /**
     * Update interval of rr_model requests (in ms)
     * This is only used by the PollConnector
     */
    updateInterval: number;

    //#endregion

    //#region REST Connector

    /**
     * Interval at which "PING\n" requests are sent to the object model on inactivity (in ms)
     */
    pingInterval: number;

    /**
     * Extra delay to await after each object model update (in ms)
     * This may be used to throttle communications so that fewer UI updates need to be rendered per time unit
     */
    updateDelay: number;

    //#endregion
}

export const DefaultConnectorSettings = {
    /**
     * Username for authorization (currently unused)
     */
    username: "",

    /**
     * Password for authorization
     */
    password: "",

    /**
     * Number of retries for HTTP requests (in ms)
     * Note that increasing the number of retries decreases the timeout for each HTTP request due to the predefined session timeout
     */
    maxRetries: 2,

    /**
     * Store of the model.plugins[] content or null if plugin functionality is disabled
     * This is only used by the PollConnector in standalone mode. In SBC mode, the object model already provides plugins[] as part of the object model 
     */
    pluginsFile: null,

    /**
     * Do not send file timestamps to the server
     */
    ignoreFileTimestamps: false,

    //#region PollConnector settings

    /**
     * Compute CRC32 checksums for file uploads
     * This is only used by the PollConnector
     */
    crcUploads: true,

    /*
     * Maximum threshold of HTTP request data lengths for automatic retries on error (in bytes)
     */
    fileTransferRetryThreshold: 358400,			// 350 KiB

    /**
     * Update interval of rr_model requests (in ms)
     * This is only used by the PollConnector
     */
    updateInterval: 250,

    //#endregion

    //#region REST Connector

    /**
     * Interval at which "PING\n" requests are sent to the object model on inactivity (in ms)
     */
    pingInterval: 2000,

    /**
     * Extra delay to await after each object model update (in ms)
     * This may be used to throttle communications so that fewer UI updates need to be rendered per time unit
     */
    updateDelay: 0

    //#endregion
}
