/**
 * Element representing a file transfer
 */
export default interface FileTransferItem {
	/**
	 * Filename of the element being transferred
	 */
	filename: string;

	/**
	 * Transferred content
	 */
	content: any;

	/**
	 * Expected respones type (if this is a download)
	 */
	type?: XMLHttpRequestResponseType;

	/**
	 * Time at which the transfer was started or null if it hasn't started yet
	 */
	startTime: Date | null;

	/**
	 * How many times this upload has been restarted
	 */
	retry: number;

	/**
	 * Current progress
	 */
	progress: number;

	/**
	 * Speed (in bytes/sec)
	 */
	speed: number | null;

	/**
	 * Size of the item to transfer or null if unknown
	 */
	size: number | null;

	/**
	 * If present this holds the error causing the transfer to fail
	 */
	error?: any;
}
