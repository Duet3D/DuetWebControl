'use strict'

// Returns an ISO-like datetime string like "2016-10-24T15:39:09"
// Cannot use toISOString() here because it doesn't output the localtime
export function timeToStr(time) {
	let result = "";
	result += time.getFullYear() + "-";
	result += (time.getMonth() + 1) + "-";
	result += time.getDate() + "T";
	result += time.getHours() + ":";
	result += time.getMinutes() + ":";
	result += time.getSeconds();
	return result;
}

// Date.parse() doesn't always return correct dates.
// Hence we must parse it using a regex here
export function strToTime(str) {
	const results = /(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/.exec(str);
	if (results != null) {
		const date = new Date();
		date.setFullYear(results[1]);
		date.setMonth(results[2] - 1);
		date.setDate(results[3]);
		date.setHours(results[4]);
		date.setMinutes(results[5]);
		date.setSeconds(results[6]);
		return date;
	}
	return undefined;
}
