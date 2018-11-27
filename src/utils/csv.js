/* eslint-disable */
'use strict'

class CSV {
	// TODO turn the following into a useful CSV parser class
	
	parseCSV(str) {
		let arr = [];
		let quote = false;  // true means we're inside a quoted field

		// iterate over each character, keep track of current row and column (of the returned array)
		for (let row = col = c = 0; c < str.length; c++) {
			let cc = str[c], nc = str[c+1];        // current character, next character
			if (arr.length <= row) { arr.push([]); }
			if (arr[row].length <= col) { arr[row].push([""]); }

			// If the current character is a quotation mark, and we're inside a
			// quoted field, and the next character is also a quotation mark,
			// add a quotation mark to the current column and skip the next character
			if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

			// If it's just one quotation mark, begin/end quoted field
			if (cc == '"') { quote = !quote; continue; }

			// If it's a comma and we're not in a quoted field, move on to the next column
			if (cc == ',' && !quote) { ++col; continue; }

			// If it's a newline and we're not in a quoted field, move on to the next
			// row and move to column 0 of that new row
			if (cc == '\n' && !quote) { ++row; col = 0; continue; }

			// Otherwise, append the current character to the current column
			arr[row][col] += cc;
		}
		return arr;
	}

	getCSVValue(csvArray, key) {
		if (csvArray.length > 1) {
			let index = csvArray[0].indexOf(key);
			if (index == -1) {
				return undefined;
			}
			return csvArray[1][index].trim();
		}
		return undefined;
	}
}

export default CSV
