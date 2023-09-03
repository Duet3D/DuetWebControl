import { LoginError } from '@/utils/errors';

import PollConnector from './PollConnector';
import RestConnector from './RestConnector';

/**
 * List of connectors supported by DWC
 */
const connectorTypes = [PollConnector, RestConnector];

/**
 * Connect asynchronously and return the connector that worked.
 * If no connector can be found, the last error will be re-thrown
 * @param hostname Hostname to connect to
 * @param username Optional username for authorization
 * @param password Optional password for authorization
 * @returns Connector instance on success
 * @throws {NetworkError} Failed to establish a connection
 * @throws {InvalidPasswordError} Invalid password
 * @throws {NoFreeSessionError} No more free sessions available
 * @throws {BadVersionError} Incompatible firmware version (no object model?)
 */
export async function connect(hostname: string, username: string, password: string) {
	let lastError: Error = new LoginError();
	for (const connectorType of connectorTypes) {
		try {
			return await connectorType.connect(hostname, username, password);
		} catch (e) {
			lastError = e as Error;
			if (e instanceof LoginError) {
				// This connector could establish a connection but the firmware refused it
				break;
			}
		}
	}
	throw lastError;
}
