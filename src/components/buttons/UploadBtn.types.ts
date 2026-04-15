/**
 * Types of uploads
 */
export enum UploadType {
	/**
	 * Upload to /gcodes
	 */
	gcodes = "gcodes",

	/**
	 * Upload & start (to /gcodes)
	 */
	start = "start",

	/**
	 * Upload to /macros
	 */
	macros = "macros",

	/**
	 * Upload to /filaments
	 */
	filaments = "filaments",

	/**
	 * Upload to /firmware (used to be /sys)
	 */
	firmware = "firmware",

	/**
	 * Upload to /menu
	 */
	menu = "menu",

	/**
	 * Upload to /sys
	 */
	system = "system",

	/**
	 * Upload to /www
	 */
	web = "web",

	/**
	 * Upload for plugin installation
	 */
	plugin = "plugin",

	/**
	 * Upload for general updates (firmware, web interface)
	 */
	update = "update"
}
