export default function variantD3(d3, vizId, theSelection) {

    // dimensions
    var margin = {top: 10, right: 0, bottom: 20, left: 110},
        width = 1000,
        height = 400;
    // scales
    var x = d3.scaleLinear(),
        y = d3.scaleLinear();
    // axis
    var xAxis = d3.axisBottom(x)
        .tickFormat(tickFormatter);

    // variables
    var borderRadius = 1,
        variantHeight = 12,
        regionStart = null,
        regionEnd = null,
        showXAxis = true,
        xTickFormat = null,
        heightPercent = "100%",
        widthPercent = "100%",
        verticalLayers = 1,
        verticalPadding = 3,
        showTransition = true,
        lowestWidth = 3,
        dividerLevel = false,
        container = null,
        selection = theSelection;


    function getSymbol(d) {
        if (d.type.toUpperCase() === 'DEL') {
            return d3.symbolTriangle;
        } else if (d.type.toUpperCase() === 'INS') {
            return d3.symbolCircle;
        } else if (d.type.toUpperCase() === 'COMPLEX') {
            return d3.symbolDiamond;
        }
    }

    function chart() {
        // merge options and defaults
        // options = $.extend(defaults, options);

        if (verticalLayers == null) {
            verticalLayers = 1;
        }

        // Recalculate the height based on the number of vertical layers
        // Not sure why, but we have to bump up the layers by one; otherwise,
        // y will be negative for first layer
        height = verticalLayers * (variantHeight + verticalPadding);
        height += (variantHeight + verticalPadding);
        // Account for the margin when we are showing the xAxis
        if (showXAxis) {
            height += margin.bottom;
        }
        if (dividerLevel) {
            height += (variantHeight + verticalPadding);
        }
        var dividerY = dividerLevel ? height - ((dividerLevel + 1) * (variantHeight + verticalPadding)) : null;

        // determine inner height (w/o margins)
        var innerHeight = height - margin.top - margin.bottom;

        selection.each(function(data) {
            // set svg element
            container = d3.select(this);
            container.selectAll("svg").remove();

            if (data && data.length > 0 && data[0] && data[0].features && data[0].features.length > 0) {

                // Update the x-scale.
                regionStart = data[0].start;
                regionEnd = data[0].end;
                if (regionStart && regionEnd) {
                    x.domain([regionStart, regionEnd]);
                } else {
                    x.domain([d3.min(data, function (d) {
                        return d3.min(d.features, function (f) {
                            return parseInt(f.start);
                        })
                    }),
                        d3.max(data, function (d) {
                            return d3.max(d.features, function (f) {
                                return parseInt(f.end);
                            })
                        })
                    ]);

                }
                x.range([0, width - margin.left - margin.right]);

                // Update the y-scale.
                y.domain([0, data.length]);
                y.range([innerHeight, 0]);

                // Find out the smallest interval between variants on the x-axis
                // for each level. For a single nucleotide variant, what is
                // the standard width we would like to show given the minimum
                // distance between all variants.
                // TODO:  Need to use this as a factor for increasing
                // width of multi-base variants.
                var minWidth = 6;
                // For each level
                for (var l = 0; l < verticalLayers; l++) {
                    // For each row in array (per variant set; only one variant set)
                    var minInterval = null;
                    data.forEach(function (d) {
                        // For each variant.  Calculate the distance on the screen
                        // between the 2 variants.
                        for (var i = 0; i < d.features.length - 1; i++) {
                            if (d.features[i].level === l) {
                                // find the next feature at the same level
                                var nextPos = null;
                                for (var next = i + 1; next < d.features.length; next++) {
                                    if (d.features[next].level === l) {
                                        nextPos = next;
                                        break;
                                    }
                                }
                                if (nextPos) {
                                    var interval = Math.round(x(d.features[nextPos].start) - x(d.features[i].end));
                                    interval = Math.max(interval, 1);
                                    if (minInterval == null || interval < minInterval) {
                                        minInterval = interval;
                                    }
                                } else {
                                    // We couldn't find a second position at the same
                                    // level
                                }
                            }
                        }
                        // Once we know the smallest interval for a level, compare it
                        // so that we can keep track of the smallest between all levels.
                        // This will determine the width of a snp.
                        if (minInterval != null && minInterval < minWidth) {
                            minWidth = minInterval;
                        }

                    });
                }

                // TODO:  Come up with a better pileup algorithm to ensure
                // there is at least one pixel between each variant.  This
                // works if the variant can be 1 pixel width, but we really want
                // to signify a square for snps.  For now, try out
                // a rectangle with a min width of 3.
                minWidth = Math.max(minWidth, lowestWidth);

                // TODO:  Need to review this code!!!  Added for exhibit
                minWidth = variantHeight;

                var symbolScaleCircle = d3.scaleOrdinal()
                    .domain([3, 4, 5, 6, 7, 8, 10, 12, 14, 16])
                    .range([9, 15, 25, 38, 54, 58, 70, 100, 130, 260]);
                var symbolSizeCircle = symbolScaleCircle(minWidth);

                var symbolScale = d3.scaleOrdinal()
                    .domain([3, 4, 5, 6, 7, 8, 10, 12, 14, 16])
                    .range([9, 15, 20, 25, 32, 58, 70, 100, 130, 160]);

                var symbolSize = symbolScale(minWidth);

                // Select the svg element, if it exists.
                var svg = container.selectAll("svg").data([0]);


                var g = svg.join("svg")
                    .attr("width", widthPercent)
                    .attr("height", heightPercent)
                    .attr('viewBox', "0 0 " + parseInt(width + margin.left + margin.right) + " " + parseInt(height + margin.top + margin.bottom))
                    .attr("preserveAspectRatio", "none")
                    .append("g")
                    .attr("class", "group")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                // The chart dimensions could change after instantiation, so update viewbox dimensions
                // every time we draw the chart.
                d3.select(this).selectAll("svg")
                    .filter(function () {
                        return this.parentNode === container.node();
                    })
                    .attr('viewBox', "0 0 " + parseInt(width + margin.left + margin.right) + " " + parseInt(height + margin.top + margin.bottom));


                // Create the X-axis.
                g.selectAll(".x.axis").remove();
                if (showXAxis) {
                    g.append("g")
                        .attr("class", "x axis")
                        .style('font-size', '14px')
                        .attr("transform", "translate(0," + (y.range()[0] + margin.bottom - margin.top) + ")")
                        .call(xAxis);
                }

                // Create dividing line
                g.selectAll(".divider").remove();
                if (dividerLevel) {
                    var divider = g.append("g")
                        .attr("class", "divider")
                        .attr("transform", "translate(0," + dividerY + ")");
                    divider.append("line").attr("class", "dashed")
                        .attr("x1", 0)
                        .attr("x2", width)
                        .attr("y", 0);
                    divider.append("text").attr("x", width / 2)
                        .attr("y", 20)
                        .text("Heterozygous");
                    divider.append("text").attr("x", width / 2)
                        .attr("y", -10)
                        .text("Homozygous");

                }

                // Start variant model
                // add elements
                var track = g.selectAll('.track.snp')
                    .data(data)
                    .join('g')
                    .attr('class', 'track snp')
                    .attr('transform', function (d, i) {
                        return "translate(0," + y(i + 1) + ")"
                    });

                var trackindel = g.selectAll('.track.indel')
                    .data(data)
                    .join('g')
                    .attr('class', 'track indel')
                    .attr('transform', function (d, i) {
                        return "translate(0," + y(i + 1) + ")"
                    });


                track.selectAll('.variant').remove();
                trackindel.selectAll('.variant').remove();


                // snps
                track.selectAll('.variant')
                    .data(function (d) {
                        return d['features'].filter(function (d) {
                            return d.type.toUpperCase() === 'SNP' || d.type.toUpperCase() === 'MNP';
                    });
                }).join('rect')
                    .attr('class', function (d) {
                        return classifyByImpact(d);
                    })
                    .style('fill', function(d) {
                        return getImpactColor(d);
                    })
                    .attr('rx', borderRadius)
                    .attr('ry', borderRadius)
                    .attr('x', function (d) {
                        return Math.round(x(d.start) - (minWidth / 2) + (minWidth / 4));
                    })
                    .attr('width', function () {
                        return showTransition ? 0 : variantHeight;
                    })
                    .attr('y', function (d) {
                        return showTransition ? 0 : height - ((d.level + 1) * (variantHeight + verticalPadding));
                    })
                    .attr('height', variantHeight);


                // insertions and deletions
                trackindel.selectAll('.variant').data(function (d) {
                    var indels = d['features'].filter(function (d) {
                        return d.type.toUpperCase() === 'DEL'
                            || d.type.toUpperCase() === 'INS'
                            || d.type.toUpperCase() === 'COMPLEX';
                    });
                    return indels;
                }).join('path')
                    .attr("d", function (d) {
                        return d3.symbol()
                            .size(symbolSize)
                            .type(getSymbol(d))();
                    })
                    .attr('class', function (d) {
                        return classifyByImpact(d);
                    })
                    .style('fill', function(d) {
                        return getImpactColor(d);
                    })
                    .attr("transform", function (d) {
                        var xCoord = x(d.start) + 2;
                        var yCoord = showTransition ? 0 : height - ((d.level + 1) * (variantHeight + verticalPadding)) + 3;
                        var tx = "translate(" + xCoord + "," + yCoord + ")";
                        return tx;
                    });

                // exit
                track.exit().remove();
                trackindel.exit().remove();

                // update
                if (showTransition) {
                    var interval = 1000 / data[0].features.length;

                    track.transition()
                        .duration(1000)
                        .attr('transform', function (d, i) {
                            return "translate(0," + y(i + 1) + ")"
                        });


                    track.selectAll('.variant.snp, .variant.mnp').sort(function (a, b) {
                        return parseInt(a.start) - parseInt(b.start)
                    })
                        .transition()
                        .duration(1200)
                        .delay(function (d, i) {
                            return i * interval;
                        })
                        .ease(d3.easeBounce)
                        .attr('x', function (d) {
                            return d3.format('d')(x(d.start) - (minWidth / 2) + (minWidth / 4));
                        })
                        .attr('width', function () {
                            return variantHeight;
                        })
                        .attr('y', function (d) {
                            return height - ((d.level + 1) * (variantHeight + verticalPadding));
                        })
                        .attr('height', function () {
                            return variantHeight;
                        });

                    trackindel.selectAll('.variant.del')
                        .transition()
                        .duration(1000)
                        .delay(function (d, i) {
                            return i * interval;
                        })
                        .ease(d3.easeBounce)
                        .attr("d", function (d) {
                            return d3.symbol()
                                .size(symbolSize)
                                .type(getSymbol(d))();
                        })
                        .attr("transform", function (d) {
                            var xCoord = x(d.start) + 2;
                            var yCoord = height - ((d.level + 1) * (variantHeight + verticalPadding)) + 3;
                            var tx = "translate(" + xCoord + "," + yCoord + ")";
                            return tx;
                        });

                    trackindel.selectAll('.variant.ins')
                        .transition()
                        .duration(1000)
                        .delay(function (d, i) {
                            return i * interval;
                        })
                        .ease(d3.easeBounce)
                        .attr("d", function (d) {
                            return d3.symbol()
                                .type(getSymbol(d))
                                .size(symbolSizeCircle)();
                        })
                        .attr("transform", function (d) {
                            var xCoord = x(d.start) + 2;
                            var yCoord = height - ((d.level + 1) * (variantHeight + verticalPadding)) + 3;
                            var tx = "translate(" + xCoord + "," + yCoord + ")";
                            return tx;
                        });

                    trackindel.selectAll('.variant.complex')
                        .transition()
                        .duration(1000)
                        .delay(function (d, i) {
                            return i * interval;
                        })
                        .attr("d", function (d) {
                            return d3.symbol()
                                .type(getSymbol(d))
                                .size(symbolSize)();
                        })
                        .attr("transform", function (d) {
                            var xCoord = x(d.start) + 2;
                            var yCoord = height - ((d.level + 1) * (variantHeight + verticalPadding)) + 3;
                            var tx = "translate(" + xCoord + "," + yCoord + ")";
                            return tx;
                        });
                }


                // Generate the x axis
                if (showXAxis) {
                    if (xTickFormat) {
                        xAxis.tickFormat(xTickFormat);
                    }
                    svg.select(".x.axis").transition()
                        .duration(200)
                        .call(xAxis);
                }


                // add a circle and arrows for 'hover' event and 'pinned' event
                ['hover', 'pinned'].forEach(function (clazz) {
                    var circleClazz = '.' + clazz + '.circle';
                    if (svg.selectAll(circleClazz).empty()) {
                        svg.selectAll(circleClazz).data([0])
                            .join('circle')
                            .attr("class", clazz + " circle")
                            .attr("cx", 0)
                            .attr("cy", 0)
                            .attr("r", variantHeight + 2)
                            .style("opacity", 0);
                    }

                    var arrowClazz = 'g.' + clazz + '.arrow';
                    if (svg.selectAll(arrowClazz).empty()) {
                        //svg.selectAll("g.arrow").remove();
                        var garrow = svg.selectAll(arrowClazz).data([0])
                            .join("g")
                            .attr("class", clazz + " arrow")
                            .attr("transform", "translate(1,0)");

                        garrow.append('line')
                            .attr("class", "arrow arrow-line")
                            .attr("x1", variantHeight + 2)
                            .attr("x2", -2)
                            .attr("y1", variantHeight + 2)
                            .attr("y2", 0)
                            .style("opacity", 0);
                        garrow.append('line')
                            .attr("class", "arrow arrow-line")
                            .attr("x1", variantHeight + 2)
                            .attr("x2", -2)
                            .attr("y1", 0)
                            .attr("y2", variantHeight + 2)
                            .style("opacity", 0);
                    }
                });
            }
        });
    }
    chart();

    function tickFormatter(d) {
        if ((d / 1000000) >= 1)
            d = d / 1000000 + "M";
        else if ((d / 1000) >= 1)
            d = d / 1000 + "K";
        return d;
    }

    function classifyByImpact(d) {
        return 'variant' + ' ' + d.type.toLowerCase();
    }

    function getImpactColor(d) {
        switch (d.impact.toUpperCase()) {
            case 'HIGH':
                return '#E0292B';
            case 'MODERATE':
                return '#F49A73';
            case 'MODIFIER':
                return '#f9e4b5';
            case 'LOW':
                return 'rgba(181, 207, 107, 0.65)';
            default:
                return '#888';
        }
    }

    // chart.margin = function (_) {
    //     if (!arguments.length) return margin;
    //     margin = _;
    //     return chart;
    // };
    // chart.width = function (_) {
    //     if (!arguments.length) return width;
    //     width = _;
    //     return chart;
    // };
    // chart.height = function (_) {
    //     if (!arguments.length) return height;
    //     height = _;
    //     return chart;
    // };
    // chart.widthPercent = function (_) {
    //     if (!arguments.length) return widthPercent;
    //     widthPercent = _;
    //     return chart;
    // };
    // chart.heightPercent = function (_) {
    //     if (!arguments.length) return heightPercent;
    //     heightPercent = _;
    //     return chart;
    // };
    // chart.x = function (_) {
    //     if (!arguments.length) return x;
    //     x = _;
    //     return chart;
    // };
    // chart.y = function (_) {
    //     if (!arguments.length) return y;
    //     y = _;
    //     return chart;
    // };
    // chart.xAxis = function (_) {
    //     if (!arguments.length) return xAxis;
    //     xAxis = _;
    //     return chart;
    // };
    // // chart.yAxis = function (_) {
    // //     if (!arguments.length) return yAxis;
    // //     yAxis = _;
    // //     return chart;
    // // };
    // chart.variantHeight = function (_) {
    //     if (!arguments.length) return variantHeight;
    //     variantHeight = _;
    //     return chart;
    // };
    // chart.regionStart = function (_) {
    //     if (!arguments.length) return regionStart;
    //     regionStart = _;
    //     return chart;
    // };
    // chart.regionEnd = function (_) {
    //     if (!arguments.length) return regionEnd;
    //     regionEnd = _;
    //     return chart;
    // };
    // chart.showXAxis = function (_) {
    //     if (!arguments.length) return showXAxis;
    //     showXAxis = _;
    //     return chart;
    // };
    // chart.xTickFormat = function (_) {
    //     if (!arguments.length) return xTickFormat;
    //     xTickFormat = _;
    //     return chart;
    // };
    // chart.showBrush = function (_) {
    //     if (!arguments.length) return showBrush;
    //     showBrush = _;
    //     return chart;
    // };
    // chart.brushHeight = function (_) {
    //     if (!arguments.length) return brushHeight;
    //     brushHeight = _;
    //     return chart;
    // };
    // chart.verticalLayers = function (_) {
    //     if (!arguments.length) return verticalLayers;
    //     verticalLayers = _;
    //     return chart;
    // };
    // chart.verticalPadding = function (_) {
    //     if (!arguments.length) return verticalPadding;
    //     verticalPadding = _;
    //     return chart;
    // };
    // chart.showTransition = function (_) {
    //     if (!arguments.length) return showTransition;
    //     showTransition = _;
    //     return chart;
    // };
    // chart.clazz = function (_) {
    //     if (!arguments.length) return clazz;
    //     clazz = _;
    //     return chart;
    // };
    // chart.lowestWidth = function (_) {
    //     if (!arguments.length) return lowestWidth;
    //     lowestWidth = _;
    //     return chart;
    // };
    // chart.dividerLevel = function (_) {
    //     if (!arguments.length) return dividerLevel;
    //     dividerLevel = _;
    //     return chart;
    // };
    // chart.tooltipHTML = function (_) {
    //     if (!arguments.length) return tooltipHTML;
    //     tooltipHTML = _;
    //     return chart;
    // };
    // chart.showCircle = function (_) {
    //     if (!arguments.length) return showCircle;
    //     showCircle = _;
    //     return chart;
    // };
    // chart.hideCircle = function (_) {
    //     if (!arguments.length) return hideCircle;
    //     hideCircle = _;
    //     return chart;
    // };
    // chart.checkForSelectedVar = function (_) {
    //     if (!arguments.length) return checkForSelectedVar;
    //     checkForSelectedVar = _;
    //     return chart;
    // };
    // chart.promiseFilterVariants = function (_) {
    //     if (!arguments.length) return promiseFilterVariants;
    //     promiseFilterVariants = _;
    //     return chart;
    // };
    // chart.updateVariantClasses = function (_) {
    //     if (!arguments.length) return updateVariantClasses;
    //     updateVariantClasses = _;
    //     return chart;
    // };

    // New rebind paradigm
    // chart.on = function() {
    //     var value = dispatch.on.apply(dispatch, arguments);
    //     return value === dispatch ? chart : value;
    // };

    return chart;
}