import * as d3 from 'd3'
import './gauge.css'

export default class {
  constructor(el) {
    this.el = el;
    this.label = '';
    this.max = 300;
    this.setTemperature = 0;
    this.standbyTemperature = 0;
    this.currentValue = 0;

    this.svg;
    this.svgBackgroundCircle;
    this.svgCursor;
    this.svgTempText;
    this.svgSetTemp;

    this.arcStartPoint = 270;
    this.arcEndPoint = 450;

    this.tempArcSize = this.arcEndPoint - this.arcStartPoint;

    this.size = this.size !== undefined ? this.size : 100;
    this.size = this.size * 0.9; //padding

    this.darkTheme = false;

    this.build();

  }

  setLabel(label) {
    this.label = label;
  }

  setMax(max) {
    this.max = max;
  }


  build() {
    this.svg = new d3.select(this.el)
      .append('svg')
      .attr('class', 'gauge')
      .attr('viewBox', '0 -1 100 42')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'xMidYMid meet');

    let g = this.svg.append('g')
      .attr('transform', 'translate(50,40)');
    this.svgBackgroundCircle = g
      .append('circle')
      .attr('r', 40)
      .style('stroke-width', '2px')
      .attr('class', 'white')
      .attr('fill', 'white')
      .attr('stroke','black')
    

    let tickDistance  =(this.arcEndPoint - this.arcStartPoint) / 10;
    //Tick marks
    for(let idx = 0; idx <= 10; idx++){

      g.append('rect')
      .attr('width', function() {
        return idx === 0 || idx === 10 ? '6px' : '2px'      })
      .attr('height','4px')
      .attr('x',function() {
        return idx === 0 || idx === 10 ? '-3px' : '-1px'}
        )
      .attr('y', '-5px')
      .attr('fill', function() {
        if(idx === 10){
        return 'red'
        }
        else if (idx === 0){
          return 'green'
        }
      })
      .attr('transform', `rotate(${this.arcStartPoint + tickDistance * idx}) translate(0,-34)  scale(1,1)`)
    }

    this.svgSetTemp = g.append('g')
    this.svgSetTempElement = this.svgSetTemp.append('rect')
    .attr('width', '2px')
    .attr('height','4px')
    .attr('x','-1px')
    .attr('y', '-5px')
    .attr('fill','orange')
    .attr('transform', `rotate(${this.arcStartPoint}) translate(0,-34) scale(1,1)`)



    //This is the live temp cursor
    this.svgCursor = g.append('g');
    this.svgCursorElement = this.svgCursor
      .append('path')
      .attr('d', d3.symbol().type(d3.symbolTriangle))
      .attr('transform', `rotate(${this.arcStartPoint}) translate(0,-28) scale(1,1)`)
      .attr('stroke', 'black')
      .attr('stroke-width', '1px');

    this.svgTempText = this.svg.append('text')
      .attr('x', 50)
      .attr('y', 36)
      .attr('font-size', '8px')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', 'black')
      .text('')

    //gauge bottom
    g.append('rect')
    .attr('width','80px')
    .attr('height','2px')
    .attr('x','-40px')
    .attr('fill','black')
    .attr('stroke','black')


  }

  update(currentValue) {

    //Prevent transitions from queueing up when the browser goes to background
    if (document.hidden) return;

    let that = this;

    this.updateTempText();
    //No need to run an animation if the temperature has not changed.
    if (Math.floor(this.currentValue) === Math.floor(currentValue)) {
      return;
    }

    //this.svgTopText.text(Math.floor(currentValue));
    this.svg.attr('title',`Max Temp : ${this.max}`);

    //Live Temp
    this.svgCursor
      .transition()
      .duration(200)
      .attrTween('transform', function () {
        let targetRotation = that.getRotationAngle(currentValue);
        let currentRotation = that.getRotationAngle(that.currentValue);
        return function (step) {
          let stepRotation = currentRotation + (targetRotation - currentRotation) * step;
          that.currentValue = currentValue;
          return 'rotate(' + stepRotation + ')';
        };
      });

      this.svgSetTemp
      .attr('transform', `rotate(${this.getRotationAngle(this.setTemperature)})`);

    
  }

  updateState(state) {

    if (document.hidden) return;


    let stateCSS = 'gauge-off';
    switch (state) {
      case 'off':
        if (this.currentValue > 40) {
          stateCSS = 'gauge-cooling';
        } else {
          stateCSS = 'gauge-off';
        }
        break;
      case 'standby':
        {
          if (this.standbyTemperature > this.currentValue - 5 && this.standbyTemperature < this.currentValue + 5) {
            stateCSS = "gauge-activeattemp"
          }
          else if (this.standbyTemperature > 0) {
            stateCSS = 'gauge-active';
          }
          else if (this.standbyTemperature === 0 && this.currentValue > 40) {
            stateCSS = 'gauge-cooling';
          }
          else {
            stateCSS = 'gauge-off'
          }
        } break;
      case 'active':
        if (this.setTemperature > this.currentValue - 5 && this.setTemperature < this.currentValue + 5) {
          stateCSS = "gauge-activeattemp"
        }
        else if (this.setTemperature > 0) {
          stateCSS = 'gauge-active';
        }
        else if (this.setTemperature === 0 && this.currentValue > 40) {
          stateCSS = 'gauge-cooling';
        }
        else {
          stateCSS = 'gauge-off'
        }

        break;
      case 'fault':
        stateCSS = 'gauge-fault'
        break;
    }

    this.svgCursorElement
      .attr('class', stateCSS);
  }

  updateTempText() {
    this.svgTempText.text(`${this.currentValue} | ${this.setTemperature}`);
  }

  getRotationAngle(value) {
    let percent = value / (this.max);  // - this.config.min
    if (percent > 1) {
      percent = 1;
    } else if (percent < 0) {
      percent = 0;
    }
    return this.tempArcSize * percent;
  }



}