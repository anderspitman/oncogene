export default class VariantTooltip {

    constructor(globalApp, genericAnnotation, glyph, translator, annotationScheme, genomeBuildHelper, tipType, homeComponent) {
        this.globalApp = globalApp;
        this.genericAnnotation = genericAnnotation;
        this.glyph = glyph;
        this.translator = translator;
        this.annotationScheme = annotationScheme;
        this.genomeBuildHelper = genomeBuildHelper;
        this.WIDTH = tipType === "click" ? 750 : 360;
        this.ARROW_OFFSET = 18;
        this.ARROW_WIDTH = 10;
        this.BOTTOM_TOOLTIP_VERT_OFFSET = 22;
        this.SIDE_TOOLTIP_HORZ_OFFSET = 35;
        this.SIDE_TOOLTIP_VERT_OFFSET = 30;
        this.VALUE_EMPTY = "-";
        this.AF_BAR_WIDTH = '300';
        this.tipType = tipType;
        this.parent = homeComponent;
    }

    addClickButtonListeners(variant) {
        this.globalApp.$('#click-tip-exit-btn').on('click', () => {
            this.parent.onExitClickTooltip();
        });
        this.globalApp.$('#click-tip-flag-btn').on('click', () => {
            this._toggleFlagButton(variant);
            this.parent.onFlagVariant(variant);
        });
        this.globalApp.$('#click-tip-pileup-btn').on('click', () => {
            this.parent.onShowPileupForVariant();
        });
    }


    fillAndPositionTooltip(tooltip, variant, geneObject, theTranscript, lock, coord, trackId, affectedInfo, cohortMode, maxAlleleCount, html) {
        const me = this;
        if (lock) {
            return;
        }
        if (me.tipType === "click") {
            tooltip.style("z-index", 128);      // Makes tooltip work w/ pileup dialog
            tooltip.transition()
                .duration(1000)
                .style("opacity", 1)
                .style("pointer-events", "all");
        } else {
            tooltip.style("z-index", 128);
            tooltip.transition()
                .duration(1000)
                .style("opacity", 1)
                .style("pointer-events", "none");
        }
        if (html == null) {
            let pinMessage = "click on variant for more details";
            if (me.tipType === "click") {
                html = me.formatClickContent(variant, pinMessage, 'tooltip', geneObject, theTranscript, trackId, lock);
            } else {
                html = me.formatHoverContent(variant, pinMessage, 'tooltip', geneObject, theTranscript, trackId, lock);
            }
        }
        tooltip.html(html);
        me.injectVariantGlyphs(tooltip, variant, lock ? '.tooltip-wide' : '.tooltip');
        if (me.tipType === 'click') {
            me.injectAlleleCountSvg('af-svg', variant, affectedInfo, maxAlleleCount, trackId, me.AF_BAR_WIDTH);
        }

        // let w = me.WIDTH;
        // let h = Math.round(tooltip[0][0].offsetHeight);
        let h = Math.round(tooltip.node().offsetHeight);

        // We use css variables to place the tooltip chevron in the middle, center of the tooltip
        let middlePos = (h / 2);
        tooltip.style("--tooltip-middle", middlePos + "px");
        tooltip.style("--tooltip-middle-before", (middlePos - 3) + "px");

        let centerPos = (me.WIDTH / 2);
        tooltip.style("--tooltip-center", centerPos + "px");
        tooltip.style("--tooltip-center-before", (centerPos - 3) + "px");
        tooltip.classed("chevron", false);
        tooltip.classed("chevron-vertical", false);
        tooltip.classed("chevron-horizontal", false);
        tooltip.classed("chevron-top", false);
        tooltip.classed("chevron-bottom", false);
        tooltip.classed("chevron-middle", false);
        tooltip.classed("chevron-left", false);
        tooltip.classed("chevron-right", false);
        tooltip.classed("chevron-center", false);

        let x = coord.x;
        let y = coord.y;
        let yScroll = window.pageYOffset;

        let tooltipPos = {
            top: null,
            left: null,
            arrowClasses: []
        };

        me.findBestTooltipPosition(tooltipPos, coord, x, y, h, me.WIDTH, yScroll);
        if (tooltipPos.left && tooltipPos.top) {
            tooltipPos.arrowClasses.forEach(function (arrowClass) {
                tooltip.classed(arrowClass, true);
            });
            tooltip.style("width", me.WIDTH + "px")
                .style("left", tooltipPos.left + "px")
                .style("text-align", 'left')
                .style("top", tooltipPos.top + "px");
        }

        if (me.tipType === 'click') {
            me.addClickButtonListeners(variant);
        }
    }

    findBestTooltipPosition(tooltipPos, coord, x, y, h, w, yScroll) {
        const me = this;
        let availSpace = {
            'top': {allowed: false},
            'bottom': {allowed: false},
            'middle': {allowed: false},
            'right': {allowed: false},
            'left': {allowed: false},
            'center': {allowed: false},
        };

        // If the tooltip sits above the element, is the top of the tooltip
        // below the top of the window?
        if ((y - h) - yScroll >= 0) {
            availSpace.top.allowed = true;
            availSpace.top.tooltipTop = y - h;
            availSpace.top.sideTooltipVertOffset = me.SIDE_TOOLTIP_VERT_OFFSET;
        }
        // If the tooltip sits below the elements, is the bottom of the tooltip
        // above the bottom of the window?
        if ((y + coord.height + h) - yScroll < me.globalApp.utility.visibleHeight(me.globalApp.$('body'))) {
            availSpace.bottom.allowed = true;
            availSpace.bottom.tooltipTop = y + coord.height;
            availSpace.bottom.sideTooltipVertOffset = -1 * me.SIDE_TOOLTIP_VERT_OFFSET;
        }
        // If the tooltip sits in the center (either to the left or right) of the element,
        // are both top and bottom edges within the window?
        if ((y + coord.height / 2) - (h / 2) - yScroll >= 0
            && ((y + coord.height / 2) + (h / 2) - yScroll < me.globalApp.utility.visibleHeight(me.globalApp.$('body')))) {
            availSpace.middle.allowed = true;
            availSpace.middle.tooltipTop = y + (coord.height / 2);
            availSpace.middle.sideTooltipVertOffset = -1 * (h / 2);
        }
        // If the tooltip sits to the right of the element, is the right
        // edge of the tooltip inside the window?
        if (x > 0 && (x + w) < coord.parentWidth) {
            availSpace.right.allowed = true;
            availSpace.right.tooltipLeft = x;
            availSpace.right.tooltipLeftOffset = -1 * (me.ARROW_OFFSET + me.ARROW_WIDTH);
            availSpace.right.sideTooltipHorzOffset = me.SIDE_TOOLTIP_HORZ_OFFSET;
        }
        // If the tooltip sits to the left of the element, is the left
        // edge of the tooltip within the window?
        if (x - w > 0) {
            availSpace.left.allowed = true;
            availSpace.left.tooltipLeft = (x - w);
            availSpace.left.tooltipLeftOffset = me.ARROW_OFFSET + me.ARROW_WIDTH;
            availSpace.left.sideTooltipHorzOffset = -1 * me.SIDE_TOOLTIP_HORZ_OFFSET;
        }
        // If the tooltip sits in the center (either above or below) of the element,
        // are both left and right edges within the window?
        if (x - (w / 2) > 0 && x + (w / 2) < coord.parentWidth) {
            availSpace.center.allowed = true;
            availSpace.center.tooltipLeft = x - (w / 2);
            availSpace.center.tooltipLeftOffset = me.ARROW_WIDTH;
            availSpace.center.sideTooltipHorzOffset = 0;
        }

        let found = false;
        let assignTooltip = function (key1, key2, force = false) {
            found = false;
            tooltipPos.top = null;
            tooltipPos.left = null;
            tooltipPos.arrowClasses = ['chevron'];

            tooltipPos.top = availSpace[key1].tooltipTop ? availSpace[key1].tooltipTop : availSpace[key2].tooltipTop;
            tooltipPos.left = availSpace[key1].tooltipLeft ? availSpace[key1].tooltipLeft + availSpace[key1].tooltipLeftOffset : availSpace[key2].tooltipLeft + availSpace[key2].tooltipLeftOffset;
            found = (tooltipPos.top && tooltipPos.left) || force;

            if (found) {
                if (key1 === 'top') {
                    tooltipPos.arrowClasses.push('chevron-vertical');
                } else if (key1 === 'bottom'){
                    tooltipPos.arrowClasses.push('chevron-vertical');
                    tooltipPos.top += me.BOTTOM_TOOLTIP_VERT_OFFSET ;
                } else {
                    tooltipPos.arrowClasses.push('chevron-horizontal');
                    tooltipPos.left += availSpace[key1].sideTooltipHorzOffset;
                    tooltipPos.top += availSpace[key2].sideTooltipVertOffset;
                }
                tooltipPos.arrowClasses.push("chevron-" + key1);
                tooltipPos.arrowClasses.push("chevron-" + key2);
            }
            return found;
        };

        coord.preferredPositions.forEach(function (preferredPos) {
            for (var key1 in preferredPos) {
                if (!found && availSpace[key1].allowed) {
                    preferredPos[key1].forEach(function (key2) {
                        if (!found && availSpace[key2].allowed) {
                            assignTooltip(key1, key2);
                        }
                    })
                }
            }
        });
        // If we can't find enough space, just choose first preferred position.
        if (!found) {
            let pp = coord.preferredPositions[0];
            let key1 = Object.keys(pp)[0];
            let key2 = pp[key1][0];
            found = assignTooltip(key1, key2, true);
            if (!found) {
                console.log("Could not find position for tooltip");
            }
        }
    }

    injectVariantGlyphs(tooltip, variant) {
        const me = this;
        let tooltipNode = me.globalApp.$(tooltip.node());
        let info = me.globalApp.utility.formatDisplay(variant, me.translator, me.isEduMode);

        let injectClinvarBadge = function (clinsig, key, translate) {
            clinsig.split(",").forEach(function (clinsigToken) {
                if (me.translator.clinvarMap.hasOwnProperty(clinsigToken)) {
                    var clazz = me.translator.clinvarMap[clinsigToken].clazz;
                    var badge = me.translator.clinvarMap[clinsigToken].examineBadge;

                    var linkSelector = ".tooltip-clinsig-link" + key;
                    if (badge && tooltipNode.find(linkSelector).length > 0) {
                        var div = tooltipNode.find(linkSelector);
                        me.globalApp.$(div).prepend("<svg class=\"clinvar-badge\" style=\"float:left\"  height=\"12\" width=\"14\">");
                        var svg = me.globalApp.d3.select(me.globalApp.$(div).find("svg.clinvar-badge")[0]);
                        var selection = svg.data([{
                            width: 10,
                            height: 10,
                            transform: (translate ? translate : 'translate(0,1)'),
                            clazz: clazz
                        }]);
                        me.glyph.showClinVarSymbol(selection);
                    }
                }
            })
        };

        let injectClickClinvarBadge = function (clinsig, divId, translate) {
            clinsig.split(',').forEach((clinsigToken) => {
                if (me.translator.clinvarMap.hasOwnProperty(clinsigToken)) {
                    let clazz = me.translator.clinvarMap[clinsigToken].clazz;

                    let outerDiv = me.globalApp.d3.select('#' + divId);
                    outerDiv.append('svg')
                        .attr('class', 'clinvar-badge')
                        .style('float', 'left')
                        .attr('height', 22)
                        .attr('width', 14);

                    let svg = outerDiv.select('svg.clinvar-badge');
                    let selection = svg.data([{
                        width: 10,
                        height: 10,
                        transform: (translate ? translate : 'translate(0,1)'),
                        clazz: clazz
                    }]);
                    me.glyph.showClinVarSymbol(selection);
                }
            })
        };

        let injectClickSomaticBadge = function (isInherited, divId, translate) {
            if (isInherited === true) {
                return;
            }
            let outerDiv = me.globalApp.d3.select('#' + divId);
            outerDiv.append('svg')
                .attr('class', 'somatic-badge')
                .style('float', 'left')
                .attr('height', 22)
                .attr('width', 14);

            let svg = outerDiv.select('svg.somatic-badge');
            let selection = svg.data([{
                width: 12,
                height: 12,
                transform: (translate ? translate : 'translate(0,1)')
            }]);
            if (isInherited === false) {
                me.glyph.showSomaticSymbol(selection);
            } else if (isInherited === null) {
                me.glyph.showUndeterminedSymbol(selection);
            }
        };

        let injectCosmicBadge = function(inCosmic, divId, translate) {
            if (inCosmic == null || inCosmic === false) {
                return;
            }
            let outerDiv = me.globalApp.d3.select('#' + divId);
            outerDiv.append('svg')
                .attr('class', 'cosmic-badge')
                .style('float', 'left')
                .attr('height', 22)
                .attr('width', 14);

            let svg = outerDiv.select('svg.cosmic-badge');
            let selection = svg.data([{
                width: 12,
                height: 12,
                transform: (translate ? translate : 'translate(0,1)')
            }]);

            let options = { 'styles': 'font-size: 14px' };
            me.glyph.showCosmicSymbol(selection, options);
        };

        let injectImpactBadge = function(variant, vepImpact, divId, translate1, translate2) {
            let outerDiv = me.globalApp.d3.select('#' + divId);
            outerDiv.append('svg')
                .attr('class', 'impact-badge')
                .style('float', 'left')
                .attr('height', 22)
                .attr('width', 14);

            let svg = outerDiv.select('svg.impact-badge');
            let selection = svg.data([{
                width: 10,
                height: 10
            }]);

            let impactClazz = me.translator.impactMap[vepImpact].clazz;
            let options = { 'transform1': translate1, 'transform2': translate2 };
            me.glyph.showImpactBadge(selection, variant, impactClazz, me.globalApp.d3, options);
        };

        if (variant.clinvarSubmissions && variant.clinvarSubmissions.length > 0) {
            let clinsigUniq = {};
            variant.clinvarSubmissions.forEach(function (submission) {
                submission.clinsig.split(",").forEach(function (clinsig) {
                    clinsigUniq[clinsig] = "";
                })
            });
            for (var clinsig in clinsigUniq) {
                if (me.tipType === 'click') {
                    injectClickClinvarBadge(clinsig, 'clickTipClinvar', 'translate(0,5)');
                } else {
                    injectClinvarBadge(clinsig, clinsig, 'translate(0,0)');
                }
            }
        } else if (variant.clinVarClinicalSignificance) {
            for (let clinsig in variant.clinVarClinicalSignificance) {
                var key = variant.clinVarClinicalSignificance[clinsig];
                injectClinvarBadge(clinsig, key);
            }
        }
        if (variant.inheritance && variant.inheritance !== '') {
            let clazz = me.translator.inheritanceMap[variant.inheritance].clazz;
            let symbolFunction = me.translator.inheritanceMap[variant.inheritance].symbolFunction;
            if (tooltipNode.find(".tooltip-title:contains('inheritance')").length > 0) {
                tooltipNode.find(".tooltip-title:contains('inheritance')").prepend("<svg class=\"inheritance-badge\"  height=\"15\" width=\"16\">");
                let options = {width: 15, height: 15, transform: 'translate(0,0)'};
                let selection = tooltip.select('.inheritance-badge').data([{clazz: clazz}]);
                symbolFunction(selection, options);
            }
        }

        if (me.tipType === 'click') {
            injectClickSomaticBadge(variant.isInherited, 'clickTipSomatic', 'translate(0,5)');
            injectCosmicBadge(variant.inCosmic, 'clickTipCosmic', 'translate(0,5)');
            injectImpactBadge(variant, info.vepImpact.toUpperCase(), 'clickTipImpact', 'translate(1,5)', 'translate(5, 8)');
        }
    }

    injectAlleleCountSvg(divId, variant, affectedInfo, maxAlleleCount, trackId, barWidth) {
        const me = this;

        // Add header
        let container = me.globalApp.d3.select('#' + divId);
        let svg = container.append("div")
            .attr("id", "allele-count-legend")
            .append("svg")
            .attr("width", "350")
            .attr("height", "20");
        svg.append("text")
            .attr("x", "5")
            .attr("y", "15")
            .attr("anchor", "start")
            .attr("class", "click-label")
            .text("Sample")
            .style('text-decoration', 'underline');

        let af_g = svg.append("g")
            .attr("transform", "translate(75,1)");

        af_g.append('text')
            .attr("x", "5")
            .attr("y", "14")
            .attr("class", "click-label")
            .attr("anchor", "start")
            .text("Allele Freq")
            .style('text-decoration', 'underline');
        af_g.append('text')
            .attr('x', '107')
            .attr('y', '14')
            .attr('class', 'click-label')
            .text('Counts')
            .style('text-decoration', 'underline');

        let g = svg.append("g")
            .attr("transform", "translate(232,-4)");

        g.append("text")
            .attr("x", "7")
            .attr("y", "14")
            .attr("class", "alt-count-under")
            .attr("anchor", "start")
            .text("alt");
        g.append("text")
            .attr("x", "28")
            .attr("y", "13")
            .attr("class", "other-count-under")
            .attr("anchor", "start")
            .text("other");
        g.append("text")
            .attr("x", "67")
            .attr("y", "14")
            .attr("class", "ref-count")
            .attr("anchor", "start")
            .text("ref");
        g.append("text")
            .attr("x", "90")
            .attr("y", "19")
            .attr("class", "ref-count")
            .attr("anchor", "start")
            .text("total");

        g.append("rect")
            .attr("x", "1")
            .attr("y", "16")
            .attr("height", 4)
            .attr("width", 28)
            .attr("class", "alt-count");
        g.append("rect")
            .attr("x", "29")
            .attr("y", "16")
            .attr("height", 4)
            .attr("width", 28)
            .attr("class", "other-count");
        g.append("rect")
            .attr("x", "57")
            .attr("y", "16")
            .attr("height", 4)
            .attr("width", 28)
            .attr("class", "ref-count");

        container.append('img')
            .attr('id', 'af-svg-loader')
            .attr('width', '20px')
            .attr('height', '20px')
            .attr('src', '../../../assets/images/wheel.gif')
            .style('margin-left', '150px');

        // Add body
        me._injectAlleleCountBody(container, variant, trackId, affectedInfo, 'time', maxAlleleCount, barWidth);
    }

    _injectAlleleCountBody(container, variant, id, affectedInfo, cohortMode, maxAlleleCount, barWidth) {
        const me = this;

        // Workaround to adjust max allele count for all samples
        let adjustedMaxAlleleCount = maxAlleleCount;
        affectedInfo.forEach(function (info) {
            let sampleName = info.model.getSelectedSample();
            let genotype = variant.genotypes ? variant.genotypes[sampleName] : null;
            if ((+genotype.altCount + +genotype.refCount) > adjustedMaxAlleleCount) {
                adjustedMaxAlleleCount = +genotype.altCount + +genotype.refCount;
            }
            if (+genotype.genotypeDepth > adjustedMaxAlleleCount) {
                adjustedMaxAlleleCount = +genotype.genotypeDepth;
            }
        });

        // Make sure we have coverage info for each sample at the variant location
        let genotypeInfo = [];
        let depthPromises = [];
        affectedInfo.forEach(function (info) {
            let matchingVar = info.model.variantIdHash[variant.id];
            let sampleName = info.model.getSelectedSample();
            let genotype = matchingVar && matchingVar.genotypes ? matchingVar.genotypes[sampleName] : null;

            // If we don't have a matching variant to pull a genotype from, check cached BAM sites (normal only)
            if (genotype == null) {
                if (info.model.somaticVarCoverage) {
                    let matchingDepth = info.model.somaticVarCoverage.filter((coverageArr) => {
                        return coverageArr[0] === variant.start;
                    });
                    if (matchingDepth.length > 0) {
                        let depth = matchingDepth[0][1];
                        genotype = {'altCount': '0'};
                        genotype['refCount'] = (depth + '');
                        genotype['genotypeDepth'] = (depth + '');
                        genotypeInfo.push({ 'modelOrder': info.model.order, 'genotype': genotype });                    }
                }

                // If genotype is still null, have to check actual BAM
                if (genotype == null) {
                    // todo: if model.info is a SampleModel, we need to update this PoC to include bamType
                    let p = info.model.promiseGetBamDepthForVariants([{'chrom': variant.chrom, 'start': variant.start, 'end': variant.end}])
                        .then((depthArr) => {
                            let depth = depthArr[0][1];
                            // We know there are no alt counts for this site
                            genotype = {'altCount': '0'};
                            genotype['refCount'] = (depth + '');
                            genotype['genotypeDepth'] = (depth + '');
                            genotypeInfo.push({ 'modelOrder': info.model.order, 'genotype': genotype });

                            // Cache info for potential next click
                            info.model.somaticVarCoverage.push(depthArr);
                        });
                    depthPromises.push(p);
                }
            } else {
                genotypeInfo.push({ 'modelOrder': info.model.order, 'genotype': genotype });
            }
        });

        // Then do actual drawing
        Promise.all(depthPromises).then(() => {
            // Hide loader glyph
            me.globalApp.d3.select('#af-svg-loader').style('display', 'none');

            // Sort in model order to sync with affectedInfo order
            genotypeInfo.sort((a, b) => {
                return (a.modelOrder < b.modelOrder) ? -1 : 1
            });

           for (let i = 0; i < affectedInfo.length; i++) {
                let info = affectedInfo[i];
                let genotype = genotypeInfo[i].genotype;

                // We always want to show this bar, even if the variant isn't in a track
                let selectedClazz = info.model.id === id ? 'selected' : '';
                let displayName = info.model.selectedSample;
                let row = container.append("div")
                    .attr("class", "ped-info")
                    .attr("style", "display: flex");

                // Add sample name column
                row.append("div")
                    .attr("class", "click-value")
                    .attr("style", "flex: 2")
                    .html("<span class='sample-type-symbol'></span>"
                        + "<span class='ped-label "
                        + selectedClazz + "'>"
                        + (" " + displayName)
                        + "</span>");

                // Add AF column
                let formattedAf = 0;
                let afText = '0%';
                if (genotype) {
                    formattedAf = parseInt(genotype['altCount']) / parseInt(genotype['genotypeDepth']);
                    afText = formattedAf > 0 ? me.globalApp.utility.percentage(formattedAf) : '0%';
                }
                row.append("div")
                    .attr("class", "click-af-field")
                    .attr("style", "flex: 2")
                    .append('text')
                    .text(afText);

                // Add bar viz of counts
                let barContainer = row.append("div")
                    .attr("class", "allele-count-bar")
                    .attr("style", "flex: 8");
                me._appendAlleleCountSVG(barContainer,
                    genotype.altCount,
                    genotype.refCount,
                    genotype.genotypeDepth,
                    null,
                    barWidth,
                    adjustedMaxAlleleCount);
            }
        })
    }

    _appendAlleleCountSVG(container, genotypeAltCount, genotypeRefCount, genotypeDepth, bamDepth, barWidth, maxAlleleCount) {
        let MAX_BAR_WIDTH = barWidth;
        let PADDING = 20;
        MAX_BAR_WIDTH = MAX_BAR_WIDTH - PADDING;
        let BAR_WIDTH = 0;

        if ((genotypeDepth == null || genotypeDepth === '') && (genotypeAltCount == null || genotypeAltCount.indexOf(",") >= 0)) {
            container.text("");
            container
                .append("svg")
                .attr("width", MAX_BAR_WIDTH + PADDING)
                .attr("height", "21");
            return;
        }

        if (genotypeAltCount == null || genotypeAltCount.indexOf(",") >= 0) {
            BAR_WIDTH = Math.round(MAX_BAR_WIDTH * (genotypeDepth / maxAlleleCount));
            container.select("svg").remove();
            let svg = container
                .append("svg")
                .attr("width", MAX_BAR_WIDTH + PADDING)
                .attr("height", "15");
            svg.append("rect")
                .attr("x", "1")
                .attr("y", "1")
                .attr("height", 15)
                .attr("width", BAR_WIDTH)
                .attr("class", "ref-count");

            svg.append("text")
                .attr("x", BAR_WIDTH + 5)
                .attr("y", "10")
                .text(genotypeDepth);

            let g = svg.append("g")
                .attr("transform", "translate(0,0)");
            g.append("text")
                .attr("x", BAR_WIDTH / 2)
                .attr("y", 10)
                .attr("text-anchor", "middle")
                .attr("class", "ref-count")
                .text("?");
            return;
        }

        let totalCount = genotypeDepth;
        let otherCount = totalCount - (+genotypeRefCount + +genotypeAltCount);

        // proportion the widths of alt, other (for multi-allelic), and ref
        BAR_WIDTH = Math.round((MAX_BAR_WIDTH) * (totalCount / maxAlleleCount));
        if (BAR_WIDTH < 10) {
            BAR_WIDTH = 10;
        }
        if (BAR_WIDTH > PADDING + 10) {
            BAR_WIDTH = BAR_WIDTH - PADDING;
        }
        let altPercent = +genotypeAltCount / totalCount;
        let altWidth = Math.round(altPercent * BAR_WIDTH);
        let refPercent = +genotypeRefCount / totalCount;
        let refWidth = Math.round(refPercent * BAR_WIDTH);
        let otherWidth = BAR_WIDTH - (altWidth + refWidth);

        // Force a separate line if the bar width is too narrow for count to fit inside or
        // this is a multi-allelic.
        let separateLineForLabel = (altWidth > 0 && altWidth / 2 < 11) || (refWidth > 0 && refWidth / 2 < 11) || (otherWidth > 0);

        container.select("svg").remove();
        let svg = container
            .append("svg")
            .attr("width", MAX_BAR_WIDTH + PADDING)
            .attr("height", separateLineForLabel ? "31" : "21");

        if (altWidth > 0) {
            svg.append("rect")
                .attr("x", "1")
                .attr("y", "1")
                .attr("height", 10)
                .attr("width", altWidth)
                .attr("class", "alt-count");

        }
        if (otherWidth > 0) {
            svg.append("rect")
                .attr("x", altWidth)
                .attr("y", "1")
                .attr("height", 10)
                .attr("width", otherWidth)
                .attr("class", "other-count");
        }
        if (refWidth > 0) {
            svg.append("rect")
                .attr("x", altWidth + otherWidth)
                .attr("y", "1")
                .attr("height", 10)
                .attr("width", refWidth)
                .attr("class", "ref-count");
        }
        svg.append("text")
            .attr("x", BAR_WIDTH + 5)
            .attr("y", "10")
            .text(totalCount);


        let altX = 0;
        let otherX = 0;
        let refX = 0;
        let g = svg.append("g")
            .attr("transform", (separateLineForLabel ? "translate(-6,11)" : "translate(0,0)"));
        if (altWidth > 0) {
            let altX = Math.round(altWidth / 2);
            if (altX < 6) {
                altX = 6;
            }
            g.append("text")
                .attr("x", altX)
                .attr("y", "10")
                .attr("text-anchor", separateLineForLabel ? "start" : "middle")
                .attr("class", separateLineForLabel ? "alt-count-under" : "alt-count")
                .text(genotypeAltCount);

        }

        if (otherCount > 0) {
            otherX = altWidth + Math.round(otherWidth / 2);
            // Nudge the multi-allelic "other" count over to the right if it is
            // too close to the alt count.
            if (otherX - 11 < altX) {
                otherX = altX + 10;
            }
            g.append("text")
                .attr("x", otherX)
                .attr("y", "10")
                .attr("text-anchor", separateLineForLabel ? "start" : "middle")
                .attr("class", separateLineForLabel ? "other-count-under" : "other-count")
                .text(otherCount);

            let gNextLine = g.append("g")
                .attr("transform", "translate(-15,9)");
            svg.attr("height", 45);
            gNextLine.append("text")
                .attr("x", otherX < 20 ? 20 : otherX)
                .attr("y", "10")
                .attr("text-anchor", "start")
                .attr("class", "other-count-under")
                .text("(multi-allelic)");
        }
        if (genotypeRefCount > 0 && (altWidth > 0 || otherWidth > 0)) {
            refX = altWidth + otherWidth + Math.round(refWidth / 2);
            if (refX - 11 < otherX || refX - 11 < altX) {
                refX = refX + 10;
            }
            g.append("text")
                .attr("x", refX)
                .attr("y", "10")
                .attr("text-anchor", separateLineForLabel ? "start" : "middle")
                .attr("class", "ref-count")
                .text(genotypeRefCount);
        }
    }

    formatHoverContent(variant, pinMessage, tooltipClazz, geneObject, theTranscript, trackId) {
        const me = this;

        let info = me.globalApp.utility.formatDisplay(variant, me.translator, me.isEduMode);

        // Called variant information
        let calledVariantRow = "";
        if (variant.hasOwnProperty("fbCalled") && variant.fbCalled === "Y") {
            var calledGlyph = '<i id="gene-badge-called" class="material-icons glyph" style="display:inline-block;font-size:15px;vertical-align:top;float:initial">check_circle</i>';
            var marginTop = tooltipClazz === 'tooltip-wide' ? ';margin-top: 1px;' : ';margin-top: 3px;';
            calledGlyph += '<span style="display: inline-block;vertical-align: top;margin-left:3px' + marginTop + '">Called variant</span>';
            calledVariantRow = me._tooltipMainHeaderRow(calledGlyph, '', '', '');
        }

        // Clinvar information
        let clinvarSimpleRow1 = '';
        let clinvarSimpleRow2 = '';
        if (info.clinvarSig !== "") {
            if (variant.clinVarUid != null && variant.clinVarUid !== '') {
                clinvarSimpleRow1 = me._tooltipWideHeadingSecondRow('ClinVar', '<span class="tooltip-clinsig-link">' + info.clinvarSig + '</span>', null);
                if (info.phenotype) {
                    clinvarSimpleRow2 = me._tooltipWideHeadingSecondRow('&nbsp;', info.phenotype, null, 'tooltip-clinvar-pheno');
                }
            } else if (variant.clinvarSubmissions != null && variant.clinvarSubmissions.length > 0) {
                clinvarSimpleRow1 = me._tooltipSimpleClinvarSigRow('ClinVar', info.clinvarSigSummary);
                clinvarSimpleRow2 = me._tooltipHeaderRow(info.phenotypeSimple !== '' ? info.phenotypeSimple : info.phenotype, '', '', '', '', null, 'style=padding-top:0px');
            }
        }

        // Impact information
        let vepHighestImpactRowSimple = "";
        if (info.vepHighestImpact.length > 0) {
            vepHighestImpactRowSimple = me._tooltipHeaderRow(info.vepHighestImpactSimple, '', '', '', 'highest-impact-badge');
        }

        // Somatic information
        let inheritanceModeRow = me._tooltipHeaderRow('<span class="tooltip-inheritance-mode-label">'
            + me.translator.getSomaticLabel(variant.isInherited) + ' </span>', '', '', '', null, 'padding-top:0px;');

        // Cosmic information
        let cosmicRow = variant.inCosmic == null || variant.inCosmic === false ? ''
            : me._tooltipHeaderRow('<span class="tooltip-cosmic-label">' + me.translator.getCosmicLabel(variant.inCosmic) + ' </span>', '', '', '', null, 'padding-top:0px;');

        // AF information
        let sampleAf = 0;
        if (parseInt(variant.genotypeDepth) > 0) {
            sampleAf = parseInt(variant.genotypeAltCount) / parseInt(variant.genotypeDepth);
        }
        let afRow = me._tooltipMainHeaderRow('Allele Freq', (sampleAf > 0 ? me.globalApp.utility.percentage(sampleAf) : '0%'), '', '');

        if (trackId === 'matrix') {
            // Don't show AF if we're hovering over matrix - may be in multiple tracks at diff AFs
            return (
                me._tooltipMainHeaderRow(geneObject ? geneObject.gene_name : "", variant.type ? variant.type.toUpperCase() : "", info.refalt + " " + info.coord, info.dbSnpLink, 'ref-alt')
                + calledVariantRow
                + me._tooltipMainHeaderRow(info.vepImpact, info.vepConsequence, '', '', 'impact-badge')
                + vepHighestImpactRowSimple
                + inheritanceModeRow
                + (trackId === 'known-variants' ? me._tooltipRow('&nbsp;', info.clinvarLinkKnownVariants, '6px') : clinvarSimpleRow1)
                + clinvarSimpleRow2
                + cosmicRow
                + me._linksRow(variant, pinMessage)
            );
        } else if (trackId === 'cosmic-variants' || trackId === 'known-variants') {
            return (
                me._tooltipMainHeaderRow(geneObject ? geneObject.gene_name : "", variant.type ? variant.type.toUpperCase() : "", info.refalt + " " + info.coord, info.dbSnpLink, 'ref-alt')
                + calledVariantRow
                + me._tooltipMainHeaderRow(info.vepImpact, info.vepConsequence, '', '', 'impact-badge')
                + vepHighestImpactRowSimple
                + (trackId === 'known-variants' ? me._tooltipRow('&nbsp;', info.clinvarLinkKnownVariants, '6px') : clinvarSimpleRow1)
                + clinvarSimpleRow2
                + cosmicRow
                + me._linksRow(variant, pinMessage)
            );
        } else {
            return (
                me._tooltipMainHeaderRow(geneObject ? geneObject.gene_name : "", variant.type ? variant.type.toUpperCase() : "", info.refalt + " " + info.coord, info.dbSnpLink, 'ref-alt')
                + calledVariantRow
                + me._tooltipMainHeaderRow(info.vepImpact, info.vepConsequence, '', '', 'impact-badge')
                + vepHighestImpactRowSimple
                + inheritanceModeRow
                + afRow
                + (trackId === 'known-variants' ? me._tooltipRow('&nbsp;', info.clinvarLinkKnownVariants, '6px') : clinvarSimpleRow1)
                + clinvarSimpleRow2
                + cosmicRow
                + me._linksRow(variant, pinMessage)
            );
        }
    }

    /* Returns HTML that gets displayed within the tooltip */
    formatClickContent(variant, pinMessage, tooltipClazz, geneObject) {
        const me = this;

        let info = me.globalApp.utility.formatDisplay(variant, me.translator, me.isEduMode);
        let positionInfo = (geneObject ? geneObject.gene_name : "") + " " + info.coord;
        let clinvarInfo = me.globalApp.utility.capitalizeFirstLetter(info.clinvarSig);
        let labelClasses = 'click-label'; // 5
        let labelColNum = 5;
        let valueClasses = 'click-value'; // 7
        let valueColNum = 7;
        let svgValueClasses = 'click-svg-value';
        return (
            me._tooltipClickHeader("Variant Details", true)
            + me._formatLeftHalf(me._tooltipLabeledRow('Position', positionInfo, labelClasses, labelColNum, valueClasses, valueColNum, 'clickTipPosition')
                + me._tooltipLabeledRow('Type', me.globalApp.utility.translateExonInfo(info.exon) + ' ' + me.globalApp.utility.translateVariantType(variant.type), labelClasses, labelColNum, valueClasses, valueColNum,'clickTipVarType')
                + me._tooltipLabeledRow('Base \u0394', info.refalt, labelClasses, labelColNum, valueClasses, valueColNum, 'clickTipDelta')
                + me._tooltipLabeledRow('Impact', me.globalApp.utility.capitalizeFirstLetter(info.vepImpact), labelClasses, labelColNum, valueClasses, valueColNum, 'clickTipImpact')
                + me._tooltipLabeledRow('Is Somatic', variant.isInherited == null ? 'Undetermined' : variant.isInherited === true ? 'No' : 'Yes', labelClasses,  labelColNum, valueClasses, valueColNum, 'clickTipSomatic')
                + me._tooltipLabeledRowWithLink('In COSMIC', variant.inCosmic === true ? 'Yes' : 'No', labelClasses, labelColNum, valueClasses, valueColNum,'clickTipCosmic', info.cosmicUrl)
                + me._tooltipLabeledRowWithLink('ClinVar', clinvarInfo === "" ? "N/A" : clinvarInfo, labelClasses, labelColNum, valueClasses, valueColNum,'clickTipClinvar', info.clinvarUrl))
            + me._formatRightHalf(me._tooltipClickRow(me._getAfDiv(), svgValueClasses) + me._tooltipButtonRow(variant, true, true))
        );

    }

    _toggleFlagButton(variant) {
        if (!variant.isFlagged) {
            this.globalApp.d3.select('#click-tip-flag-btn').text('Remove Flag');
            let svg = this.globalApp.d3.select('#click-tip-flag-btn').append('svg')
                .attr('id', 'user-flagged-symbol')
                .attr('viewBox', '0 0 24 24')
                .attr('width', 18)
                .attr('height', 18)
                .attr('class', 'click-tip-flag-icon');
            svg.append('path')
                .attr('d', 'M0 0h24v24H0z')
                .attr('fill', 'none');
            svg.append('path')
                .attr('d', 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z');
        } else {
            this.globalApp.d3.select('#click-tip-flag-btn').text('Flag Variant');
            let svg = this.globalApp.d3.select('#click-tip-flag-btn').append('svg')
                .attr('id', 'user-flagged-symbol')
                .attr('viewBox', '0 0 24 24')
                .attr('width', 18)
                .attr('height', 18)
                .attr('class', 'click-tip-flag-icon');
            svg.append('path')
                .attr('d', 'M0 0h24v24H0z')
                .attr('fill', 'none');
            svg.append('path')
                .attr('d', 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z');
        }
    }

    _formatLeftHalf(html) {
        return '<v-container fluid fill-height><div style="display: flex"><div style="flex: 6; padding-top: 5px; padding-bottom: 5px; padding-left: 5px; padding-right: 15px">' + html + '</div>';
    }

    _formatRightHalf(html) {
        return '<div style="padding:5px; margin-left: 10px; flex: 6">' + html + '</div></div></v-container>';
    }

    _getAfDiv() {
        return '<div id="af-svg"></div>';
    }

    _getCoverageDiv() {
        return '<div id="coverage-svg"></div>'
    }


    _linksRow(variant, pinMessage) {
        if (pinMessage == null) {
            pinMessage = 'Click on variant for more details';
        }
        return '<div class="row tooltip-footer">'
            + '<div class="col-md-12 pin-message" style="text-align:right;">' + pinMessage + '</div>'
            + '</div>';
    }


    _tooltipHeaderRow(value1, value2, value3, value4, clazz, style) {
        var theStyle = style ? style : '';
        theStyle += ' margin: 0; padding: 0';
        var clazzList = "col-md-12 tooltip-title";
        if (clazz) {
            clazzList += " " + clazz;
        }
        return '<div class="row" style="' + theStyle + '">'
            + '<div class="' + clazzList + '" style="text-align:center">' + value1 + ' ' + value2 + ' ' + value3 + ' ' + value4 + '</div>'
            + '</div>';
    }

    _tooltipMainHeaderRow(value1, value2, value3, value4, clazz) {
        var theClass = "col-md-12 tooltip-title main-header";
        if (clazz) {
            theClass += " " + clazz;
        }
        return '<div class="row">'
            + '<div class="' + theClass + '" style="text-align:center">' + value1 + ' ' + value2 + ' ' + value3 + ' ' + value4 + '</div>'
            + '</div>';
    }

    _tooltipClickHeader(tooltipName, showExitButton) {
        let titleWidth = '12';
        if (showExitButton) {
            titleWidth = '11';
        }
        let titleLine = '<v-row><v-col cols="' + titleWidth + '" class="click-tip-header">' + tooltipName + '</v-col>';
        let buttons = '';
        if (showExitButton) {
            buttons += '<v-col cols="1" style="padding-right:4px"><button id="click-tip-exit-btn" type="button" class="click-tip-close-btn btn btn--flat btn--small btn--icon" style="float: right"><i class="icon material-icons">clear</i></button></v-col></v-row>'
        }
        let dividerLine = '<hr class="click-tip-divider">';
        return titleLine + buttons + dividerLine;
    }

    _tooltipClickRow(value, clazz) {
        return '<div style="flex: 5" class="' + clazz + '"><div style="flex: 7">' + value + '</div></div>';
    }

    _tooltipClassedRow(value1, class1, value2, class2, style) {
        var theStyle = style ? style : '';
        return '<div class="row" style="' + theStyle + '">'
            + '<div class="col-md-12 tooltip-title" style="text-align:center">'
            + "<span class='" + class1 + "'>" + value1 + '</span>'
            + "<span class='" + class2 + "'>" + value2 + '</span>'
            + '</div>'
            + '</div>';
    }

    _tooltipLabeledRow(label, value, labelClazz, labelColNum, valueClazz, valueColNum, valueId) {
        return '<div style="padding: 2px 0px; display: flex">'
            + '<div style="flex: ' + labelColNum + '" class="' + labelClazz + '" style="text-align:left;word-break:none;"><u>' + label + ':</u></div>'
            + '<div style="flex: ' + valueColNum + '" class="' + valueClazz + '" style="text-align:left;word-break:normal;" id="' + valueId + '">' + value + '</div>'
            + '</div>';
    }

    _tooltipLabeledRowWithLink(label, value, labelClazz, labelColNum, valueClazz, valueColNum, valueId, link) {
        let row = '<div style="padding: 2px 0px; display: flex">'
            + '<div class="' + labelClazz + '" style="text-align:left;word-break:none; flex:' + labelColNum + '"><u>' + label + '</u>:</div>'
            + '<div class="' + valueClazz + '" style="text-align:left;word-break:normal; flex:' + valueColNum + '" id="' + valueId + '">' + value;
            if (link) {
                row += '<a href="' + link + '" target="' + label + '" style="padding-left: 4px;"><i class="icon link-icon material-icons">open_in_new</i></a>';
            }
            row += '</div></div>';
        return row;
    }


    _tooltipButtonRow(variant, showFlagBtn, showPileupBtn) {
        let buttons = '';
        if (showFlagBtn) {
            let buttonText = variant.isFlagged ? 'Remove Flag' : 'Flag Variant';
            buttons += '<div><button id="click-tip-flag-btn" class="click-tip-btn mx-2 px-5 py-2">'
                +  buttonText
                + '<svg id="user-flagged-symbol" viewBox="0 0 24 24" width="18" height="18" class="click-tip-icon">'
                + '<path d="M0 0h24v24H0z" fill="none"/>'
                + '<path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>'
                + '</svg>'
                + '</button>'
        }
        if (showPileupBtn) {
            buttons += '<button id="click-tip-pileup-btn" class="click-tip-btn mx-2 px-5 py-2">Show Pileup' +
                '<i class="material-icons glyph click-tip-icon" style="padding-right: 3px; font-size: 16px">line_style</i></button></div>'
        }
        return buttons;
    }

    _tooltipWideHeadingRow(value1, value2, paddingTop) {
        var thePaddingTop = paddingTop ? "padding-top:" + paddingTop + ";" : "";
        return '<div class="row" style="padding-bottom:5px;' + thePaddingTop + '">'
            + '<div class="col-sm-4 tooltip-title"  style="text-align:right;word-break:normal">' + value1 + '</div>'
            + '<div class="col-sm-8 tooltip-title" style="text-align:left;word-break:normal">' + value2 + '</div>'
            + '</div>';
    }

    _tooltipWideHeadingSecondRow(value1, value2, paddingTop, valueClazz) {
        var thePaddingTop = paddingTop ? "padding-top:" + paddingTop + ";" : "";
        return '<div class="row" style="padding-bottom:5px;' + thePaddingTop + '">'
            + '<div class="col-sm-4 tooltip-title" style="text-align:right;word-break:normal">' + value1 + '</div>'
            + '<div class="col-sm-8 tooltip-title' + (valueClazz ? ' ' + valueClazz : '') + '" style="text-align:left;word-break:normal">' + value2 + '</div>'
            + '</div>';
    }

    _tooltipSimpleClinvarSigRow(value1, value2) {
        return '<div class="row" style="padding-bottom:0px;padding-top: 5px">'
            + '<div class="col-sm-4 tooltip-title" style="text-align:right;word-break:normal">' + value1 + '</div>'
            + '<div class="col-sm-8 tooltip-title style="text-align:left;word-break:normal">' + value2 + '</div>'
            + '</div>';
    }

    _tooltipRow(label, value, paddingTop, alwaysShow, valueClazz, paddingBottom) {
        if (alwaysShow || (value && value !== '')) {
            var style = paddingTop || paddingBottom ?
                (' style="'
                    + (paddingTop ? 'padding-top:' + paddingTop + ';' : '')
                    + (paddingBottom ? 'padding-bottom:' + paddingBottom + ';' : '')
                    + '"') : '';
            var valueClazzes = "tooltip-value";
            if (valueClazz) {
                valueClazzes += " " + valueClazz;
            }
            if (value === "") {
                value = this.VALUE_EMPTY;
            }
            return '<div class="tooltip-row"' + style + '>'
                + '<div class="tooltip-header" style="text-align:right">' + label + '</div>'
                + '<div class="' + valueClazzes + '">' + value + '</div>'
                + '</div>';
        } else {
            return "";
        }
    }

}


