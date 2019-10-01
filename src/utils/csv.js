'use strict'

class CSV {
	headers = []
	content = []

	constructor(content) {
		let row = 0, col = 0, inQuote = false;
		for (let i = 0; i < content.length; i++) {
			const char = content[i], nextChar = content[i + 1];

			// Make sure we have enough rows+cols
			if (row === 0) {
				if (this.headers.length <= col) {
					this.headers.push('');
				}
			} else {
				if (this.content.length < row) {
					this.content.push([]);
				}
				if (this.content[row - 1].length <= col) {
					this.content[row - 1].push('');
				}
			}

			// Deal with escaped quotes
			if (inQuote && char === '"' && nextChar === '"') {
				if (row === 0) {
					this.headers[col] += char;
				} else {
					this.content[row - 1][col] += char;
				}
				i++;
				continue;
			}

			// Deal with the start or end of a field
			if (char === '"') {
				inQuote = !inQuote;
				continue;
			}

			// Check if we can move on to the next field
			if (char === ',' && !inQuote) {
				col++;
				continue;
			}

			// Check if we can move on to the next row
			if (char === '\n' && !inQuote) {
				this.content.push([]);
				col = 0;
				++row;
				continue;
			}

			// Otherwise append the current character
			if (row === 0) {
				this.headers[col] += char;
			} else {
				this.content[row - 1][col] += char;
			}
		}
	}

	get(fieldName, row = 0) {
		const index = this.headers.findIndex(header => header === fieldName);
		if (index === -1) {
			return undefined;
		}
		return this.content[row][index];
	}
}

export default CSV
