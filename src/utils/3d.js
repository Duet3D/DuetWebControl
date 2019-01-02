'use strict'

import { Color, Vector3, Face3, SphereGeometry, Matrix4, Mesh, MeshBasicMaterial, Geometry, PlaneGeometry } from 'three'

import { InvalidHeightmapError } from './errors.js'

const pointTolerance = 2.0
const smallIndicatorRadius = 0.01, mediumIndicatorRadius = 0.02, bigIndicatorRadius = 0.05

// Draw scale+legend next to the 3D control
export function drawLegend(canvas, maxVisualizationZ, colorScheme) {
	// Clear background
	const context = canvas.getContext("2d");
	context.rect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "black";
	context.fill();

	// Put annotations above gradient
	context.font = "14px Roboto,sans-serif";
	context.textAlign = "center";
	context.fillStyle = "white";
	context.fillText("Scale:", canvas.width / 2, 21);
	context.fillText(`${maxVisualizationZ} mm`, canvas.width / 2, 44);
	context.fillText("or more", canvas.width / 2, 60);

	// Make scale gradient
	const showAxes = canvas.height > 180;
	let scaleHeight = showAxes ? (canvas.height - 139) : (canvas.height - 96);
	if (colorScheme === "terrain") {
		scaleHeight -= 16;
	}

	const gradient = context.createLinearGradient(0, 66, 0, 66 + scaleHeight);
	if (colorScheme === "terrain") {
		gradient.addColorStop(0.0, "hsl(0,100%,45%)");
		gradient.addColorStop(0.25, "hsl(60,100%,45%)");
		gradient.addColorStop(0.5, "hsl(120,100%,45%)");
		gradient.addColorStop(0.75, "hsl(180,100%,45%)");
		gradient.addColorStop(1.0, "hsl(240,100%,45%)");
	} else {
		gradient.addColorStop(0.0, "hsl(0,100%,45%)");
		gradient.addColorStop(0.5, "hsl(60,100%,45%)");
		gradient.addColorStop(1.0, "hsl(120,100%,45%)");
	}
	context.fillStyle = gradient;
	context.fillRect(canvas.width / 2 - 12, 66, 24, scaleHeight);

	// Put annotation below gradient
	context.fillStyle = "white";
	if (colorScheme === "terrain") {
		context.fillText(`${-maxVisualizationZ} mm`, canvas.width / 2, scaleHeight + 82);
		context.fillText("or less", canvas.width / 2, scaleHeight + 98);
		scaleHeight += 16;
	} else {
		context.fillText("0.00 mm", canvas.width / 2, scaleHeight + 82);
	}

	// Add axes
	if (showAxes) {
		context.fillText("Axes:", canvas.width / 2, scaleHeight + 109);
		context.font = "bold " + context.font;
		context.fillStyle = "rgb(255,0,0)";
		context.fillText("X", canvas.width / 3, scaleHeight + 129);
		context.fillStyle = "rgb(0,255,0)";
		context.fillText("Y", canvas.width / 2, scaleHeight + 129);
		context.fillStyle = "rgb(0,0,255)";
		context.fillText("Z", 2 * canvas.width / 3, scaleHeight + 129);
	}
}

function getColorByZ(z, colorScheme, maxVisualizationZ) {
	// Terrain color scheme (i.e. from blue to red, asymmetric)
	if (colorScheme === "terrain") {
		z = Math.max(Math.min(z, maxVisualizationZ), -maxVisualizationZ);
		const hue = 240 - ((z + maxVisualizationZ) / maxVisualizationZ) * 120;
		return new Color("hsl(" + hue + ",100%,45%)");
	}

	// Default color scheme (i.e. the worse the redder, symmetric)
	const hue = 120 - Math.min(Math.abs(z), maxVisualizationZ) / maxVisualizationZ * 120;
	return new Color("hsl(" + hue + ",100%,45%)");
}

// Apply colors to the faces
export function setFaceColors(geometry, scaleZ, colorScheme, maxVisualizationZ) {
	for (let i = 0; i < geometry.faces.length; i++) {
		const face = geometry.faces[i];
		const a = getColorByZ(geometry.vertices[face.a].z / scaleZ, colorScheme, maxVisualizationZ);
		const b = getColorByZ(geometry.vertices[face.b].z / scaleZ, colorScheme, maxVisualizationZ);
		const c = getColorByZ(geometry.vertices[face.c].z / scaleZ, colorScheme, maxVisualizationZ);

		if (face.vertexColors.length < 3) {
			face.vertexColors = [a, b, c];
		} else {
			face.vertexColors[0].copy(a);
			face.vertexColors[1].copy(b);
			face.vertexColors[2].copy(c);
		}
	}
	geometry.colorsNeedUpdate = true;
}

function translateGridPoint(meshGeometry, vector, scaleZ) {
	let x, y;
	if (meshGeometry.type === "PlaneGeometry") {
		x = (vector.x / meshGeometry.parameters.width + 0.5) * (meshGeometry.xMax - meshGeometry.xMin) + meshGeometry.xMin;
		y = (vector.y / meshGeometry.parameters.height + 0.5) * (meshGeometry.yMax - meshGeometry.yMin) + meshGeometry.yMin;
	} else if (meshGeometry.type === "Geometry") {
		x = (vector.x + 0.5) * (meshGeometry.xMax - meshGeometry.xMin) + meshGeometry.xMin;
		y = (vector.y + 0.5) * (meshGeometry.yMax - meshGeometry.yMin) + meshGeometry.yMin;
	} else {
		throw new Error(`Unsupported geometry: ${meshGeometry.type}`);
	}
	const z = vector.z / scaleZ;
	return new Vector3(x, y, z);
}

// Generate ball-style indicators
export function generateIndicators(meshGeometry, numPoints, scaleZ, color, opacity) {
	let indicators = [], centerPointGenerated = false;

	for (let i = 0; i < meshGeometry.vertices.length; i++) {
		// Convert world coordinate to "real" probe coordinates
		const x = meshGeometry.vertices[i].x;
		const y = meshGeometry.vertices[i].y;
		const z = meshGeometry.vertices[i].z;
		const trueProbePoint = translateGridPoint(meshGeometry, new Vector3(x, y, z), scaleZ);

		// Skip center point if it already exists
		if (Math.sqrt(trueProbePoint.x * trueProbePoint.x + trueProbePoint.y * trueProbePoint.y) < pointTolerance) {
			if (centerPointGenerated) {
				continue;
			}
			centerPointGenerated = true;
		}

		// If we have a close point, create a new indicator
		if (!isNaN(trueProbePoint.z)) {
			const radius = (numPoints > 64) ? smallIndicatorRadius
				: (numPoints > 9) ? mediumIndicatorRadius
					: bigIndicatorRadius;
			const sphereGeometry = new SphereGeometry(radius);
			sphereGeometry.applyMatrix(new Matrix4().makeTranslation(x, y, z));

			const material = new MeshBasicMaterial({ color, opacity, transparent: true });
			const sphere = new Mesh(sphereGeometry, material);
			sphere.coords = trueProbePoint;

			indicators.push(sphere);
		}
	}

	return indicators;
}

function getNearestZ(points, x, y, maxDelta) {
	// Get the point that is closest to X+Y
	let point, delta;
	for (let i = 0; i < points.length; i++) {
		const deltaNew = Math.sqrt(Math.pow(x - points[i][0], 2) + Math.pow(y - points[i][1], 2));
		if (delta === undefined || deltaNew < delta) {
			point = points[i];
			delta = deltaNew;
		}
	}

	// Check if we exceed the maximum allowed delta
	if (delta === undefined || (maxDelta !== undefined && delta > maxDelta)) {
		return NaN;
	}

	// Otherwise return the closest Z coordinate of this point
	return point[2];
}

// Generate a mesh geometry
export function generateMeshGeometry(probePoints, xMin, xMax, yMin, yMax, scaleZ) {
	/** Cartesian 3-point and 5-point bed compensation (deprecated) **/

	if (probePoints.length === 3 || probePoints.length === 5) {
		const geometry = new Geometry();
		geometry.xMin = xMin;
		geometry.xMax = xMax;
		geometry.yMin = yMin;
		geometry.yMax = yMax;

		// Generate vertices
		for (let i = 0; i < probePoints.length; i++) {
			const x = (probePoints[i][0] - xMin) / (xMax - xMin) - 0.5;
			const y = (probePoints[i][1] - yMin) / (yMax - yMin) - 0.5;
			const z = probePoints[i][2] * scaleZ;

			geometry.vertices.push(new Vector3(x, y, z));
		}

		// Generate faces
		if (probePoints.length === 3) {
			geometry.faces.push(new Face3(0, 1, 2));
		} else {
			geometry.faces.push(new Face3(0, 1, 4));
			geometry.faces.push(new Face3(1, 2, 4));
			geometry.faces.push(new Face3(2, 3, 4));
			geometry.faces.push(new Face3(3, 0, 4));
		}

		return geometry;
	}

	/** New grid-based compensation **/

	// Find out how many different X+Y coordinates are used
	const xPoints = [], yPoints = [];
	for (let i = 0; i < probePoints.length; i++) {
		const z = probePoints[i][2];
		if (!isNaN(z)) {
			const x = probePoints[i][0], y = probePoints[i][1];
			if (xPoints.indexOf(x) === -1) {
				xPoints.push(x);
			}
			if (yPoints.indexOf(y) === -1) {
				yPoints.push(y);
			}
		}
	}

	// Check if the coordinates are valid
	if (!xPoints.some(point => !isNaN(point)) || !yPoints.some(point => !isNaN(point))) {
		throw new InvalidHeightmapError();
	}

	// Generate plane geometry for grid
	const width = xMax - xMin, height = yMax - yMin;
	const planeWidth = (width < height) ? Math.abs(width / height) : 1.0;
	const planeHeight = (height < width) ? Math.abs(height / width) : 1.0;

	const planeGeometry = new PlaneGeometry(planeWidth, planeHeight, xPoints.length - 1, yPoints.length - 1);
	planeGeometry.xMin = xMin;
	planeGeometry.xMax = xMax;
	planeGeometry.yMin = yMin;
	planeGeometry.yMax = yMax;

	for (let i = planeGeometry.vertices.length - 1; i >= 0; i--) {
		const x = ((planeGeometry.vertices[i].x / planeWidth) + 0.5) * width + xMin;
		const y = ((planeGeometry.vertices[i].y / planeHeight) + 0.5) * height + yMin;
		const z = getNearestZ(probePoints, x, y) * scaleZ;

		planeGeometry.vertices[i].z = z;
	}

	// Add extra faces to each top row to avoid zig-zag lines (for round grids)
	let yCurrent;
	for (let i = 1; i < planeGeometry.vertices.length / 2; i++) {
		const vertex = planeGeometry.vertices[i], prevVertex = planeGeometry.vertices[i - 1];

		if (!isNaN(prevVertex.z) && isNaN(vertex.z)) {
			var yPoint = vertex.y;
			if (yCurrent === undefined || yCurrent > yPoint) {
				// We are at the last defined point in this row
				yCurrent = yPoint;

				// Find the next two points below and below+right to this one
				let a, b;
				for (let k = i + 1; k < planeGeometry.vertices.length - 1; k++) {
					const nextVertex = planeGeometry.vertices[k];
					if (nextVertex.x === prevVertex.x && nextVertex.y === planeGeometry.vertices[k + 1].y) {
						a = k;
						b = k + 1;
						break;
					}
				}

				// If that succeeds add a new face
				if (a !== undefined && !isNaN(planeGeometry.vertices[a].z) && !isNaN(planeGeometry.vertices[b].z)) {
					const face = new Face3(a, b, i - 1);
					planeGeometry.faces.push(face);
				}
			}
		}
	}

	// Add extra faces to each bottom row to avoid zig-zag lines (for round grids)
	let prevVertex;
	for (let i = Math.floor(planeGeometry.vertices.length / 2); i < planeGeometry.vertices.length; i++) {
		const vertex = planeGeometry.vertices[i];

		// Check if this is the first defined point in this row
		if (prevVertex !== undefined && prevVertex.y === vertex.y && isNaN(prevVertex.z) && !isNaN(vertex.z)) {
			// Find the two points above and above+left to this one
			let a, b;
			for (let k = i - 1; k > 0; k--) {
				const prevVertex = planeGeometry.vertices[k];
				if (prevVertex.x === vertex.x && prevVertex.y === planeGeometry.vertices[k - 1].y) {
					a = k - 1;
					b = k;
					break;
				}
			}

			// If that succeeds add a new face
			if (a !== undefined && !isNaN(planeGeometry.vertices[a].z) && !isNaN(planeGeometry.vertices[b].z)) {
				const face = new Face3(a, b, i);
				planeGeometry.faces.push(face);
			}
		}
		prevVertex = vertex;
	}

	// Remove all the points and faces that have invalid values
	for (let i = planeGeometry.vertices.length - 1; i >= 0; i--) {
		if (isNaN(planeGeometry.vertices[i].z)) {
			// Remove and rearrange the associated face(s)
			for (let k = planeGeometry.faces.length - 1; k >= 0; k--) {
				const face = planeGeometry.faces[k];
				if (face.a === i || face.b === i || face.c === i) {
					planeGeometry.faces.splice(k, 1);
				} else {
					if (face.a > i) { face.a--; }
					if (face.b > i) { face.b--; }
					if (face.c > i) { face.c--; }
				}
			}

			// Remove this vertex
			planeGeometry.vertices.splice(i, 1);
		}
	}

	return planeGeometry;
}
