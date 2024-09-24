const heaterColors = [
  'primary',
  'red',
  'green',
  'orange',
  'grey',
  'lime',
  'black',
  'purple',
  'yellow',
  'teal',
  'brown',
  'deep-orange',
  'pink',
  'blue-grey',
]

export function getHeaterColor (heaterIndex: number) {
  return heaterColors[heaterIndex % heaterColors.length] + '--text'
}

export function getExtraColor (sensorIndex: number) {
  return heaterColors[(heaterColors.length - sensorIndex - 1) % heaterColors.length] + '--text'
}

export function getRealHeaterColor (heaterIndex: number, isExtra: boolean) {
  const ghostSpan = document.createElement('span')
	document.body.querySelector('#app')!.appendChild(ghostSpan)
	ghostSpan.classList.add(isExtra ? getExtraColor(heaterIndex) : getHeaterColor(heaterIndex))
	const trueColor = window.getComputedStyle(ghostSpan).color
	ghostSpan.remove()
	return trueColor
}
