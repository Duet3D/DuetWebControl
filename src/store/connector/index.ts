import ConnectorCallbacks from "./ConnectorCallbacks";
import ConnectorSettings from "./ConnectorSettings";

import PollConnector from "./PollConnector";
import RestConnector from "./RestConnector";

import { LoginError } from "./errors";

/**
 * List of supported connectors
 * By default this library only supports RRF (PollConnector) and SBC (RestConnector)
 */
export const connectorTypes = [PollConnector, RestConnector];

/**
 * Connect asynchronously and return a connector that could establish a connection.
 * If no connector could be found, the last error will be re-thrown
 * @param hostname Hostname to connect to
 * @param settings Connector settings
 * @param callbacks Callbacks invoked by the connector
 * @returns Connector instance on success
 * @throws {NetworkError} Failed to establish a connection
 * @throws {InvalidPasswordError} Invalid password
 * @throws {NoFreeSessionError} No more free sessions available
 * @throws {BadVersionError} Incompatible firmware version (no object model?)
 */
export async function connect(hostname: string, settings: ConnectorSettings, callbacks: ConnectorCallbacks) {
	let lastError: Error = new LoginError();
	for (const connectorType of connectorTypes) {
		try {
			return await connectorType.connect(hostname, settings, callbacks);
		} catch (e) {
			lastError = e as Error;
			if (e instanceof LoginError) {
				// This connector could establish a connection but the remote end refused the login attempt
				break;
			}
		}
	}
	throw lastError;
}
