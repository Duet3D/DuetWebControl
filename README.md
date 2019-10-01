# Duet Web Control

Duet Web Control is a fully-responsive HTML5-based web interface for RepRapFirmware which utilizes the Bootstrap framework, JQuery and a few other libraries to allow easy control of Duet-based 3D printer electronics.

It is designed to communicate with RepRapFirmware using WebSockets and RESTful HTTP requests. One goal of the core application is to keep things compact, so a good loading speed can be achieved even on slow networks. Another one is to communicate to the firmware using only AJAX calls, which either return JSON objects, plain texts or binary blobs.

Duet Web Control is free software; it is licensed under the terms of the GNU Public License v3.

## Supported electronics

At this time the following platforms are supported:

* Duet Maestro
* Duet 2 WiFi
* Duet 2 Ethernet
* Duet 3

## Build variants

There are two variants available:

* DuetWebControl-SD for Duet Maestro and Duet 2 series
* DuetWebControl-SBC for Duet 3

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```
