# Duet Web Control

Duet Web Control is a fully-responsive web interface for RepRapFirmware, built with Vue 3, Vuetify 4, Pinia and TypeScript, bundled with Vite. It allows easy control of Duet-based 3D printer electronics from any modern browser.

It communicates with RepRapFirmware over HTTP/REST and WebSockets in standalone mode, or via the Duet Software Framework when running on an SBC. The core application aims to stay compact so it loads quickly even on slow networks, and to talk to the firmware purely through async requests returning JSON, plain text or binary blobs.

Duet Web Control is free software; it is licensed under the terms of the GNU Public License v3.

## Supported electronics

At this time the following platforms are officially supported:

* Duet 2 Maestro
* Duet 2 WiFi
* Duet 2 Ethernet
* Duet 3 MB 6HC
* Duet 3 Mini 5+ Ethernet
* Duet 3 Mini 5+ WiFi

## Build variants

Two build variants are produced by a single `npm run build`:

* `DuetWebControl-SD.zip` for Duet Maestro, Duet 2 series, and Duet 3 series in standalone mode (gzipped assets for the board's SD card)
* `DuetWebControl-SBC.zip` for Duet 3 series in SBC mode (uncompressed assets for DSF installs)

## Project setup

Requires Node.js 20 or newer.

```
npm install
```

### Start the dev server with hot module reload

```
npm run dev
```

In order to use the local development setup with software versions >= 3.2.0, it is possible to add `M586 C"*"` to your `config.g`.
However, this is a potential security issue because it permits cross-origin requests from ALL foreign sites.

### Type-check and build for production

```
npm run build
```

### Preview the production build locally

```
npm run preview
```

### Build a plugin

```
npm run build-plugin
npm run build-plugin-pkg
```
