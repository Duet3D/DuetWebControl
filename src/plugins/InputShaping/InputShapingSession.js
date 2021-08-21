'use strict';

import CSV from '../../utils/csv.js'
import { transform } from './fft.js';

/*
let	config = {
		algorithm: null,
		frequency: null,
		damping: null,
		minAcceleration: null
};

let axis = {
	name: null,
	acceleration: [],
	amplitudes: []
}
*/

export class Record {
	constructor(name, config) {
		this.name = name;
		this.samples = null;
		this.samplingRate = null;
		this.config = config;
		this.overflows = null;
		this.frequencies = [];
		this.axis = [];
	}

	parse(file) {

		console.log("parsing:", file);
		try {
			// Load the CSV
			const csv = new CSV(file);
			if (csv.headers.length < 2 || csv.headers[0] !== 'Sample' || csv.content.length < 2) {
				throw new Error('Invalid CSV format');
			}

			// Extract details
			const details = /Rate (\d+) overflows (\d)/.exec(csv.content[csv.content.length - 1].reduce((a, b) => a + b));
			if (!details) {
				console.error("details missing");
				throw new Error('Failed to read rate and overflows');
			}
			this.samplingRate = parseFloat(details[1]);
			this.overflows = parseFloat(details[2]);
			console.log(`samplingRate ${this.samplingRate} overflows ${this.overflows}`);

			this.samples = csv.content.length - 1;
			console.log("samples", this.samples);

			this.axis = [];
			for (let col = 1; col < csv.headers.length; col++) {
				console.log("filling axis", col);
				let axis = {
					name: csv.headers[col],
					acceleration: [],
					amplitudes: []
				};

				for (let row = 0; row < csv.content.length - 1; row++) {

					if (csv.content[row].length === csv.headers.length) {

						const value = parseFloat(csv.content[row][col]);
						if (value > 2.0) {
							console.log("col", col, "row", row, "value", value);
						}

						axis.acceleration.push(value);
					}
				}

				this.axis.push(axis);
				console.log("this.axis", this.axis[this.axis.length - 1], axis);
			}

		} catch (e) {
			console.error(e);
			throw new Error("Failed parsing: ${file}.");
		}

		return this.axis;
	}

	analyze() {
		console.log("analyze", this, this.axis);
		if (!this.axis || this.axis.length < 1) {
			throw new Error("No data available.");
		}

		// Compute how many frequencies may be displayed
		const numPoints = this.samples;
		const resolution = this.samplingRate / numPoints;
		const numFreqs = Math.floor(Math.min(numPoints / 2, (this.wideBand ? (this.samplingRate / 2) : 200) / resolution));

		// Generate frequencies
		const frequencies = new Array(numFreqs);
		for (let i = 0; i < numFreqs; i++) {
			frequencies[i] = Math.round(i * resolution + resolution / 2);
		}

		this.frequencies = frequencies;

		// Perform frequency analysis for visible datasets
		for (let i = 0; i < this.axis.length; i++) {
			const real = this.axis[i].acceleration.map(e => e);
			const imag = new Array(real.length);
			imag.fill(0);
			transform(real, imag);

			console.log("frequency analysis", real, imag);

			// Compute the amplitudes
			if (numFreqs >= real.length) {
				throw new RangeError("invalid array lengths on axis ${this.axis[i].name}");
			}

			this.axis[i].amplitudes = new Array(numFreqs);
			for (let k = 0; k < numFreqs; k++) {
				this.axis[i].amplitudes[k] = (Math.sqrt(real[k + 1] * real[k + 1] + imag[k + 1] * imag[k + 1]) / numPoints);
			}
			console.log("frequency analysis done", this.axis[i].amplitudes);
		}

		return this.axis;
	}

	getConfig() {
		return this.config;
	}

	getGraph(index) {
		if (index >= 0 && index < this.axis.length)
			return this.axis[index].acceleration;

		return null;
	}

	getAmplitudes(index) {
		if (index >= 0 && index < this.axis.length)
			return this.axis[index].amplitudes;

		return null;
	}
}

export class Session {
	constructor(name) {
		this.name = name;
		this.samples = null;
		this.samplingRate = null;
		this.frequencies = null;
		this.records = [];
	}

	setName(name) {
		this.name = name;
	}

	getName() {
		return this.name;
	}

	getId() {
		return this.id;
	}

	addRecord(record) {
		let index = this.records.findIndex(e => e.name === record.name);
		if (index >= 0)
			return;

		if (this.samples == null)
			this.samples = record.samples;

		if (this.samplingRate == null)
			this.samplingRate = record.samplingRate;

		if (this.frequencies == null)
			this.frequencies = record.frequencies;

		if (this.samples != record.samples)
			throw new Error("session does not match record's number of samples");

		if (this.samplingRate != record.samplingRate)
			throw new Error("session does not match record's sampling rate");

		this.records.push(record);
	}

	removeRecord(recordName) {
		let index = this.records.findIndex(e => e.name === recordName);
		if (index < 0)
			return -1;

		this.records.splice(index, 1);
		console.log("deleted", index);
		return index;
	}

	getRecord(recordName) {
		return this.records.find(e => e.name === recordName);
	}

	getAllRecords() {
		return this.records;
	}
}
