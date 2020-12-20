'use strict';
import * as d3 from 'd3';

export default class {
  constructor(el, actionCallback) {
    this.commandCallback = actionCallback;
    this.element = el;
    this.animationDelay = 250;

    this.themeColors = {
      light: {
        primary: 'black',
        secondary: 'transparent',
        secondaryText: 'white',
        highlight: '#4287f5',
      },
      dark: {
        primary: 'white',
        secondary: 'transparent',
        secondaryText: 'black',
        highlight: '#4287f5',
      },
    };

    this.currentStep = 1;

    this.config = {
      noSelectClass: '',
      darkTheme: false,
      activeTheme: this.themeColors.light,
    };

    this.homed = {
      X: false,
      Y: false,
      Z: false
    }

    this.homedColor = '#2196f3';
    this.isRendered = false;
    this.svg;
  }

  buildMoveCommand(commandString) {
    commandString = commandString.replace(/\{\+step\}/g, this.currentStep);
    commandString = commandString.replace(/\{-step\}/g, -this.currentStep);
    commandString = 'M120\nG91\nG1 ' + commandString + '\nG90\nM121';
    return commandString;
  }

  createArrow(svg, command, x, y, rotate) {
    var g = svg.append('g');
    g.attr('transform', 'translate(' + x + ',' + y + ') rotate(' + rotate + ')');

    g.append('rect')
      .attr('class', 'svg-arrow-buffer')
      .attr('transform', 'translate(-4 -5)')
      .attr('width', 8)
      .attr('height', 12)
      .attr('fill', this.config.activeTheme.secondary);

    g.append('path')
      .classed('svg-direction-arrow', true)
      .attr('d', d3.symbol().type(d3.symbolTriangle))
      .attr('transform', 'scale(1,1)')
      .attr('stroke-width', '1px')
      .attr('fill', this.config.activeTheme.primary);
    /*
        g.append('rect')
          .classed('svg-direction-arrow', true)
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 3)
          .attr('height', 8)
          .attr('fill', this.config.activeTheme.primary)
          .attr('transform', 'translate(-1.5,0)');
    */

    let that = this;
    g.on('click', function () {
      let gcodeCommand = that.buildMoveCommand(command);
      that.commandCallback(gcodeCommand);

      g.selectAll('.svg-direction-arrow')
        .transition()
        .ease(d3.easeLinear)
        .attr('fill', that.config.activeTheme.highlight)
        .duration(that.animationDelay)
        .transition()
        .ease(d3.easeLinear)
        .attr('fill', that.config.activeTheme.primary)
        .duration(that.animationDelay);
    });

    return g;
  }


  createStepBoxes(svg, x, y) {
    let that = this;

    let g = svg.append('g').attr('transform', 'translate(' + x + ', ' + y + ')');
    let steps = [100, 50, 10, 1, 0.5, 0.05];
    let width = 15;
    let height = 6.5;

    let buttonData = g.selectAll('g').data(steps);

    buttonData.join(function (enter) {
      let stepGroup = enter.append('g');
      stepGroup
        .append('rect')
        .attr('class', 'step-button')
        .attr('stroke-width', '0.25px')
        .attr('width', width)
        .attr('height', height)
        .attr('rx', 1)
        .attr('ry', 1)
        .attr('stroke', that.config.activeTheme.primary)
        .attr('fill', function (d) {
          return d === that.currentStep ? that.config.activeTheme.primary : that.config.activeTheme.secondary;
        })

        .attr('x', 0)
        .attr('y', function (d, i) {
          return i * height + i;
        });
      stepGroup
        .append('text')
        .classed('step-text', true)
        .attr('x', width / 2)
        .attr('y', function (d, i) {
          return i * height + height / 2 + i + 0.25;
        })
        .attr('font-size', '3px')
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', function (d) {
          return d === that.currentStep ? that.config.activeTheme.secondaryText : that.config.activeTheme.primary;
        })
        .style('cursor', 'default')
        .attr("pointer-events", "none")
        .classed(that.config.noSelectClass, true)
        .text(function (d) {
          return d;
        });
      stepGroup.on('click', function (e, d) {
        that.currentStep = d;

        //update colors
        enter.selectAll('.step-text').attr('fill', function (d) {
          return d === that.currentStep ? that.config.activeTheme.secondaryText : that.config.activeTheme.primary;
        });
        enter.selectAll('.step-button').attr('fill', function (d) {
          return d === that.currentStep ? that.config.activeTheme.primary : that.config.activeTheme.secondary;
        });
      });
    });

    return g;
  }

  createHomeButton(svg, letter, command, x, y) {
    let homeButton = svg.append('g')
      .attr('class', 'home-button')
      .attr('data-axis', letter)
      .attr('transform', 'translate(' + x + ',' + y + ')');

    //wall
    homeButton
      .append('rect')
      .attr('class', 'home-icon')
      .attr('width', 8)
      .attr('height', 8)
      .attr('x', -4)
      .attr('stroke', this.config.activeTheme.secondary)
      .attr('stroke-width', '0.1px')
      .attr('fill', this.config.activeTheme.primary);

    //chimney
    homeButton
      .append('rect')
      .attr('class', 'home-icon')
      .attr('width', 1.5)
      .attr('height', 4)
      .attr('x', 2.5)
      .attr('y', -3.5)
      .attr('stroke', this.config.activeTheme.primary)
      .attr('stroke-width', '0.1px')
      .attr('fill', this.config.activeTheme.primary);

    //roof
    homeButton
      .append('path')
      .attr('class', 'home-icon')
      .attr('d', d3.symbol().type(d3.symbolTriangle))
      .attr('transform', 'scale(1,0.6)')
      .attr('stroke', this.config.activeTheme.secondary)
      .attr('stroke-width', '0.1px')
      .attr('fill', this.config.activeTheme.primary);

    homeButton
      .append('text')
      .attr('class', 'home-text')
      .attr('x', 0)
      .attr('y', 5.1)
      .attr('font-size', '5px')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', this.config.activeTheme.secondaryText)
      .style('cursor', 'default')
      .attr("pointer-events", "none")
      .classed(this.config.noSelectClass, true)
      .text(letter);

    let that = this;
    homeButton.on('click', function () {
      that.commandCallback(command);

      d3.select(this)
        .selectAll('.home-icon')
        .transition()
        .ease(d3.easeLinear)
        .attr('fill', that.config.activeTheme.highlight)
        .attr('stroke', that.config.activeTheme.highlight)
        .duration(that.animationDelay)
        .transition()
        .ease(d3.easeLinear)
        .attr('fill', function () {
          return that.homed[d3.select(this.parentNode).attr('data-axis')] ? that.homedColor : that.config.activeTheme.primary
        })
        .attr('stroke', that.config.activeTheme.secondary)
        .duration(that.animationDelay);
    });
  }

  createButton(svg, text, command, x, y, width, height) {
    var btn = svg.append('g')
    btn.attr('transform', `translate(${x} ${y})`)
    btn
      .append('rect')
      .attr('class', 'svg-button')
      .attr('stroke-width', '0.25px')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('width', width)
      .attr('height', height)
      .attr('rx', 1)
      .attr('ry', 1)
      .attr('stroke', this.config.activeTheme.primary)
      .attr('fill', this.config.activeTheme.secondary);

    btn
      .append('text')
      .attr('class', 'svg-button-text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', '3px')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', this.config.activeTheme.primary)
      .style('cursor', 'default')
      .attr("pointer-events", "none")
      .classed(this.config.noSelectClass, true)
      .text(text);


    btn.on('click', () => {
      this.commandCallback(command);

      btn.selectAll('.svg-button')
        .transition()
        .ease(d3.easeLinear)
        .attr('fill', this.config.activeTheme.highlight)
        .duration(this.animationDelay)
        .transition()
        .ease(d3.easeLinear)
        .attr('fill', this.config.activeTheme.secondary)
        .duration(this.animationDelay);
    });

    return btn;
  }


  refreshHomeButtons() {
    let that = this;
    this.svg.selectAll('.home-button')
      .selectAll('.home-icon')
      .transition()
      .ease(d3.easeLinear)
      .attr('stroke', function () {
        return that.homed[d3.select(this.parentNode).attr('data-axis')] ? that.homedColor : that.config.activeTheme.primary
      })
      .attr('fill', function () {
        return that.homed[d3.select(this.parentNode).attr('data-axis')] ? that.homedColor : that.config.activeTheme.primary
      });
  }


  updateTheme(dark) {
    this.config.activeTheme = dark ? this.themeColors.dark : this.themeColors.light;

    if (!this.isRendered) return;

    //update arrows
    this.svg.selectAll('.svg-direction-arrow').attr('fill', this.config.activeTheme.primary);
    this.svg.selectAll('.svg-arrow-buffer').attr('fill', this.config.activeTheme.secondary);

    //update circles
    this.svg
      .selectAll('.circle-button')
      .attr('stroke', this.config.activeTheme.primary)
      .attr('fill', this.config.activeTheme.secondary);

    //Update Step Boxes
    let that = this;
    this.svg.selectAll('.step-text').attr('fill', function (d) {
      return d === that.currentStep ? that.config.activeTheme.secondaryText : that.config.activeTheme.primary;
    });
    this.svg
      .selectAll('.step-button')
      .attr('stroke', this.config.activeTheme.primary)
      .attr('fill', function (d) {
        return d === that.currentStep ? that.config.activeTheme.primary : that.config.activeTheme.secondary;
      });

    //Update Homes
    this.svg
      .selectAll('.home-icon')
      .attr('fill', this.config.activeTheme.primary)
      .attr('stroke', this.config.activeTheme.secondary);
    this.svg.selectAll('.home-text').attr('fill', this.config.activeTheme.secondaryText);

    //Update Buttons
    this.svg
      .selectAll('.svg-button')
      .attr('stroke', this.config.activeTheme.primary)
      .attr('fill', this.config.activeTheme.secondary);

    //Button Text
    this.svg
      .selectAll('.svg-button-text')
      .attr('fill', this.config.activeTheme.primary)


    this.refreshHomeButtons();
  }

 createText(svg, x,y,text){

   return svg.append('text')
      .classed('step-text', true)
      .attr('x',x)
      .attr('y', y)
      .attr('font-size', '3px')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', 'black') 
      .style('cursor', 'default')
      .attr("pointer-events", "none")
      .classed(this.config.noSelectClass, true)
      .text(text);
  }

  render() {

    if(this.svg){
      return;
//      this.svg.selectAll('*').remove();
    }

    this.svg = new d3.select(this.element)
      .append('svg')
      .attr('class', 'jogger')
      .style('height','100%')
      .attr('viewBox', '0 0 100 67')
      .attr('preserveAspectRatio', 'xMidYMid meet');

    //xy
    let distance = 12;
    let arrowContainer = this.svg.append('g').attr('transform', 'translate(20  25)');
    this.createArrow(arrowContainer, 'Y{+step}', 0, -distance, 0);
    this.createArrow(arrowContainer, 'X{+step}', distance, 0, 90);
    this.createArrow(arrowContainer, 'Y{-step}', 0, distance, 180);
    this.createArrow(arrowContainer, 'X{-step}', -distance, 0, -90);

    this.createText(arrowContainer, 0, -distance, "Y+");
    this.createText(arrowContainer, 0, distance, "Y-");
    this.createText(arrowContainer, distance, 0, "X+");
    this.createText(arrowContainer, -distance, 0, "X-");

    //steps
    this.createStepBoxes(this.svg, 57, 3);

    //ud
    let zContainer = this.svg.append('g').attr('transform', 'translate(47,25)');
    this.createArrow(zContainer, 'Z{+step} ', 0, -9, 0);
    this.createArrow(zContainer, 'Z{-step}', 0, 9, 180);
    this.createText(zContainer, 0, -9, "Z+");
    this.createText(zContainer, 0, 9, "Z-");



    this.createHomeButton(this.svg, 'X', 'G28 X', 85, 5);
    this.createHomeButton(this.svg, 'Y', 'G28 Y', 85, 20);
    this.createHomeButton(this.svg, 'Z', 'G28 Z', 85, 35);
    this.createHomeButton(this.svg, 'All', 'G28', 85, 50);
    this.refreshHomeButtons();


    this.isRendered = true;
  }
  updateHomeButtons(axes) {
    axes.forEach(axis => {
      this.homed[axis.letter] = axis.homed;
    });
    this.refreshHomeButtons();
  }
}
