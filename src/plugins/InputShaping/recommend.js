'use strict';

const nj = require("numjs");

function getAmplitude(aw, bw) {
	aw.pow(2);
	bw.pow(2);

	let cw = aw.pow(2).add(bw.pow(2)).sum();

	return Math.sqrt(cw);
}

function getTotalCos(sp, tp, w) {
	let totalCos = nj.cos(tp.multiply(Math.PI * w)).sum();
	return sp.multiply(totalCos);
}

function getTotalSin(sp, tp, w) {
	let totalSin = nj.sin(tp.multiply(Math.PI * w)).sum();
	return sp.multiply(totalSin);
}

function getFreqResponse(amplitudes, durations, freqBins) {
	let A = nj.array(amplitudes);
	let T = nj.array(durations);
	let res = nj.zeros(freqBins.length);

	//console.log("A", A.tolist(), "T", T.tolist(), "res", res.tolist());

	// calculate all cos and sin
	freqBins.forEach((w, index) => {
		let cos = getTotalCos(A, T, w);
		let sin = getTotalSin(A, T, w);

		res.set(index, getAmplitude(cos, sin));
		//console.log("index", index, "cos", cos, "sin", sin, "res[index]", res[index]);
	});

	return res.divide(res.max()).tolist();
}

function getShaperResponse(amplitudes, durations, freq) {
	let A = nj.array(amplitudes);
	let T = nj.array(durations);
	let res = 0;

	//console.log("A", A.tolist(), "T", T.tolist(), "res", res.tolist());

	// calculate all cos and sin
	let cos = getTotalCos(A, T, freq);
	let sin = getTotalSin(A, T, freq);

	res = getAmplitude(cos, sin);
	//console.log("cos", cos, "sin", sin, "res", res);

	return res;
}

function analyze(x, y, z, rate, amplitudes, durations) {

	let recordFft = {
		rate: rate,
		x: nj.fft(x.map(e => [e, 0])).tolist(),
		y: nj.fft(y.map(e => [e, 0])).tolist(),
		z: nj.fft(z.map(e => [e, 0])).tolist(),
	};

	recordFft.x.forEach((val, index) => {
		let freq = recordFft.rate / 2 * index / recordFft.x.length;
		let resp = getShaperResponse(amplitudes, durations, freq);
		//console.log("freq", freq, "resp", resp);
		recordFft.x[index][0] *= resp;
		//recordFft.x[index][1] *= resp;
		recordFft.y[index][0] *= resp;
		//recordFft.y[index][1] *= resp;
		recordFft.z[index][0] *= resp;
		//recordFft.z[index][1] *= resp;
	});

	console.log("fft shaped", recordFft);

	let recordShaped = {
		rate: rate,
		x: nj.ifft(recordFft.x).tolist().map(e => e[0]),
		y: nj.ifft(recordFft.y).tolist().map(e => e[0]),
		z: nj.ifft(recordFft.z).tolist().map(e => e[0]),
	};

	console.log("time shaped ", recordShaped);

	return recordShaped;
}

function sumAndMax(array) {
	let sum = 0;
	let max = 0;

	for (let i = 0; i < array.length; i++) {
		sum += array[i];
		if (max < array[i])
			max = array[i];
	}

	return { sum, max };
}

function calculateScore(record) {
	let score = {
		x: sumAndMax(record.x),
		y: sumAndMax(record.y),
		z: sumAndMax(record.z),
	};

	console.log("score", score);

	return score;
}

module.exports = {
	getFreqResponse,
	getShaperResponse,
	calculateScore,
	analyze,
	sumAndMax,
}
