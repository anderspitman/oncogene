/* Encapsulates logic for filtering variants from a single patient (aka a single normal vs. multiple tumor samples).
 * Among other things, determines if a variant is somatic or not by incorporating filter logic. */

class FilterModel {
    constructor(translator, $) {
        this.$ = $;

        /* Initializers */
        let qualCutoff = 'qual',
            genotypeDepth = 'genotypeDepth',
            normalAltCount = 'normalAltCount',
            normalAltFreq = 'normalAltFreq',
            tumorAltCount = 'tumorAltCount',
            tumorAltFreq = 'tumorAltFreq';

        let annotation = 'annotation',
            somatic = 'somatic',
            quality = 'quality';

        /* Class constants */
        this.QUAL_CUTOFF = qualCutoff;
        this.QUAL_LOGIC = qualCutoff + '_LOGIC';
        this.GENOTYPE_DEPTH = genotypeDepth;
        this.DEPTH_LOGIC = genotypeDepth + '_LOGIC';
        this.NORMAL_COUNT = normalAltCount;
        this.NORMAL_COUNT_LOGIC = normalAltCount + '_LOGIC';
        this.NORMAL_FREQ = normalAltFreq;
        this.TUMOR_COUNT = tumorAltCount;
        this.TUMOR_COUNT_LOGIC = tumorAltCount + '_LOGIC';
        this.TUMOR_FREQ = tumorAltFreq;

        this.ANNOTATION_FILTER = annotation;
        this.SOMATIC_FILTER = somatic;
        this.QUAL_FILTER = quality;

        /* Somatic settings */
        this.DEFAULT_SOMATIC_CUTOFFS = {
            normalAltFreq: 0.01,      // Must be between 0-1
            normalAltCount: 5,
            tumorAltFreq: 0.10,       // Must be between 0-1
            tumorAltCount: 5
        };

        /* Quality settings */
        this.DEFAULT_QUALITY_FILTERING_CRITERIA = {
            genotypeDepth: 10,
            qualCutoff: 20
        };

        // The categories by which the filters are grouped
        this.filterCategories =
            [
                {
                    name: annotation,
                    display: 'Annotation Filters',
                    active: false,
                    custom: false,
                    description: 'Filter by variant effect, impact, or type',
                    icon: 'category'
                },
                {
                    name: somatic,
                    display: 'Somatic Filters',
                    active: false,
                    custom: false,
                    description: 'Select a threshold for allele frequencies and observation counts by which to identify somatic variants',
                    icon: 'flash_on'
                },
                {
                    name: quality,
                    display: 'Quality Filters',
                    active: false,
                    custom: false,
                    description: 'Filter variants by observation counts',
                    icon: 'star'
                }
            ];

        // Note: if filter names match variant object field names, don't have to manually add filter to getVarValue in Variant.d3 class
        // The actual filters that can be applied
        this.filters = {
            'annotation': [
                {name: 'impact', display: 'Impact', active: false, open: false, type: 'checkbox', tumorOnly: false, recallFilter: false},
                {name: 'type', display: 'Type', active: false, open: false, type: 'checkbox', tumorOnly: false, recallFilter: false}],
            'somatic': [
                {
                    name: tumorAltFreq,
                    display: 'Tumor Allele Frequency',
                    active: true,
                    open: false,
                    type: 'slider',
                    tumorOnly: true,
                    minValue: 0,
                    maxValue: 100,
                    labelSuffix: '%',
                    defaultLogic: '>=',
                    defaultVal: this.DEFAULT_SOMATIC_CUTOFFS.tumorAltFreq * 100,
                    currLogic: '>=',
                    currVal: this.DEFAULT_SOMATIC_CUTOFFS.tumorAltFreq * 100,
                    prevLogic: '>=',        // the logic previously used to recall somatic variants
                    prevVal: this.DEFAULT_SOMATIC_CUTOFFS.tumorAltFreq * 100,    // the value ^
                    stagedLogic: null,      // the logic slated to be changed for somatic variant recall
                    stagedVal: null,        // the value ^
                    recallFilter: true
                },
                {
                    name: tumorAltCount,
                    display: 'Tumor Alt. Observations',
                    active: true,
                    open: false,
                    type: 'slider',
                    tumorOnly: true,
                    labelSuffix: '',
                    defaultLogic: '>=',
                    defaultVal: this.DEFAULT_SOMATIC_CUTOFFS.tumorAltCount,
                    currLogic: '>=',
                    currVal: this.DEFAULT_SOMATIC_CUTOFFS.tumorAltCount,
                    prevLogic: '>=',
                    prevVal: this.DEFAULT_SOMATIC_CUTOFFS.tumorAltCount,
                    stagedLogic: null,      // the logic slated to be changed for somatic variant recall
                    stagedVal: null,        // the value ^
                    recallFilter: true
                },
                {
                    name: normalAltFreq,
                    display: 'Normal Allele Frequency',
                    active: true,
                    open: false,
                    type: 'slider',
                    tumorOnly: false,
                    minValue: 0,
                    maxValue: 100,
                    labelSuffix: '%',
                    defaultLogic: '<=',
                    defaultVal: this.DEFAULT_SOMATIC_CUTOFFS.normalAltFreq * 100,
                    currLogic: '<=',
                    currVal: this.DEFAULT_SOMATIC_CUTOFFS.normalAltFreq * 100,
                    prevLogic: '<=',
                    prevVal: this.DEFAULT_SOMATIC_CUTOFFS.normalAltFreq * 100,
                    stagedLogic: null,      // the logic slated to be changed for somatic variant recall
                    stagedVal: null,        // the value ^
                    recallFilter: true
                },
                {
                    name: normalAltCount,
                    display: 'Normal Alt. Observations',
                    active: true,
                    open: false,
                    type: 'slider',
                    tumorOnly: false,
                    labelSuffix: '',
                    defaultLogic: '<=',
                    defaultVal: this.DEFAULT_SOMATIC_CUTOFFS.normalAltCount,
                    currLogic: '<=',
                    currVal: this.DEFAULT_SOMATIC_CUTOFFS.normalAltCount,
                    prevLogic: '<=',
                    prevVal: this.DEFAULT_SOMATIC_CUTOFFS.normalAltCount,
                    stagedLogic: null,      // the logic slated to be changed for somatic variant recall
                    stagedVal: null,        // the value ^
                    recallFilter: true
                }],
            'quality': [
                {
                    name: genotypeDepth,
                    display: 'Total Observations',
                    active: true,
                    open: false,
                    type: 'slider',
                    tumorOnly: false,
                    minValue: 0,
                    maxValue: 100,
                    labelSuffix: '',
                    defaultLogic: '>=',
                    defaultVal: this.DEFAULT_QUALITY_FILTERING_CRITERIA.genotypeDepth,
                    currLogic: '>=',
                    currVal: this.DEFAULT_QUALITY_FILTERING_CRITERIA.genotypeDepth,
                    prevLogic: '>=',
                    prevVal: this.DEFAULT_QUALITY_FILTERING_CRITERIA.genotypeDepth,
                    stagedLogic: null,      // the logic slated to be changed for somatic variant recall
                    stagedVal: null,        // the value ^
                    recallFilter: true
                },
                {
                    name: qualCutoff,
                    display: 'Quality Score',
                    active: true,
                    open: false,
                    type: 'slider',
                    tumorOnly: false,
                    minValue: 0,
                    maxValue: 500,
                    labelSuffix: '',
                    defaultLogic: '>=',
                    defaultVal: this.DEFAULT_QUALITY_FILTERING_CRITERIA.qualCutoff,
                    currLogic: '>=',
                    currVal: this.DEFAULT_QUALITY_FILTERING_CRITERIA.qualCutoff,
                    prevLogic: '>=',
                    prevVal: this.DEFAULT_QUALITY_FILTERING_CRITERIA.qualCutoff,
                    stagedLogic: null,      // the logic slated to be changed for somatic variant recall
                    stagedVal: null,        // the value ^
                    recallFilter: true
                }]
        };

        // Note: checkbox lists do not require somatic recall currently,
        // but staged property could easily be added in the future
        this.checkboxLists = {
            impact: [
                {name: 'HIGH', displayName: 'HIGH', model: true, default: true},
                {name: 'MODERATE', displayName: 'MODERATE', model: true, default: true},
                {name: 'MODIFIER', displayName: 'MODIFIER', model: false, default: false},
                {name: 'LOW', displayName: 'LOW', model: true, default: true}
            ],
            type: [
                {name: 'del', displayName: 'DELETION', model: true, default: true},
                {name: 'ins', displayName: 'INSERTION', model: true, default: true},
                {name: 'mnp', displayName: 'MNP', model: true, default: true},
                {name: 'snp', displayName: 'SNP', model: true, default: true}
            ]
        };

        this.modelFilters = {
            'known-variants': {
                'vepImpact': []
            },
            'cosmic-variants': {
                'vepImpact': []
            }
        };

        this.translator = translator;

        /* The current settings */
        // this.currentSomaticCutoffs = this.DEFAULT_SOMATIC_CUTOFFS;
        // this.currentSomaticLogic = this.DEFAULT_SOMATIC_LOGIC;
    }

    /* Marks variants as somatic, or non-inherited, if they fulfill the following:
     *
     *  The normal track exhibits the following logic: (A || B) && C
     *     where
     *      A) does not contain the variant in question
     *      B) does contain the variant but at a threshold meeting slider-set criteria
     *      C) is visible/ not filtered out by other non-somatic filters (including quality)
     *
     *  AND
     *
     *  the tumor track exhibits the following logic: A && B
     *     where
     *      A) contains the variant at a threshold meeting slider-set criteria
     *      B) is visible/ not filtered out by other non-somatic filters (including quality)
     *
     *  Marks variants as inherited, if they fulfill the following:
     *
     *  The normal track contains the variant with quality thresholds met AND the tumor track contains the variant with quality thresholds met but not somatic ones
     *
     *  If globalMode is true, returns a map of selectedSampleId: somaticFeatureList.
     *  Otherwise, returns a dictionary of somatic variant IDs from all tumor tracks combined.
     */
    promiseAnnotateVariantInheritance(resultMap, featuresList, globalMode) {
        const self = this;

        return new Promise((resolve, reject) => {
            let normalSamples = [];
            let tumorSamples = [];
            let tumorSampleModelIds = [];
            let somaticVarLookup = {};
            let inheritedVarLookup = {};
            let somaticVarMap = {};
            let i = 0;

            // Classify samples
            for (i = 0; i < Object.keys(resultMap).length; i++) {
                let sampleId = Object.keys(resultMap)[i];
                let currData = self.$.extend({}, Object.values(resultMap)[i].vcfData);
                let sampleObj = {'currData': currData, 'model': Object.values(resultMap)[i]};
                if (!(resultMap[sampleId].isTumor) && sampleId !== 'known-variants' && sampleId !== 'cosmic-variants') {
                    normalSamples.push(sampleObj);
                    somaticVarMap[sampleObj.model.selectedSample] = { 'name': sampleObj.model.selectedSample, 'features': [] };
                } else if (sampleId !== 'known-variants' && sampleId !== 'cosmic-variants') {
                    tumorSamples.push(sampleObj);    // Don't need reference to model for tumor
                    tumorSampleModelIds.push(sampleId);
                    somaticVarMap[sampleObj.model.selectedSample] = { 'name': sampleObj.model.selectedSample, 'features': [] };
                }
            }

            // Make normal variant hash table
            let passesNormalFiltersLookup = {};   // Hash of variants that pass the Normal somatic filters ONLY (normal alt count and normal alt freq)
            let normalContainsLookup = {};        // Hash of all variants in normal sample
            let passesOtherFiltersLookup = {};    // Hash of variants in normal track ONLY that pass any active filters except somatic related (this includes quality)
            normalSamples.forEach((currNorm) => {
                if (currNorm && (globalMode || (currNorm.currData && (currNorm.currData.features.length > 0)))) {
                    let normFeatures = [];
                    if (globalMode) {
                        let matchingFeatureList = featuresList.filter(list => {
                            return list.name === currNorm.model.selectedSample;
                        });
                        normFeatures = matchingFeatureList[0].features;
                    } else {
                        normFeatures = currNorm.currData.features;
                    }

                    // See if normal features pass applied, non-somatic filters (ex: impact, effect, etc)
                    let filteredNormFeatures = [];
                    normFeatures.forEach((feature) => {
                        feature.isInherited = true;   // Need to mark all normal variants as inherited from null
                        normalContainsLookup[feature.id] = true;
                        // todo: not sure this is filled in yet when doing global somatic annotation
                        if (feature.passesFilters === true) {
                            filteredNormFeatures.push(feature);
                            inheritedVarLookup[feature.id] = true;
                            passesOtherFiltersLookup[feature.id] = true;
                        }
                    });

                    // See if normal features pass somatic criteria
                    for (i = 0; i < filteredNormFeatures.length; i++) {
                        let currFeat = filteredNormFeatures[i];
                        let passesNormalCount = false;

                        // If we're pulling back from annotateSomaticVars, we've already filtered based on counts
                        if (globalMode) {
                            passesNormalCount = true;
                        } else {
                            passesNormalCount = self.matchAndPassFilter(self.getFilterField(this.SOMATIC_FILTER, this.NORMAL_COUNT, 'currLogic'), currFeat.genotypeAltCount, self.getFilterField(this.SOMATIC_FILTER, this.NORMAL_COUNT, 'currVal'));
                        }
                        let currNormAf = Math.round(currFeat.genotypeAltCount / currFeat.genotypeDepth * 100) / 100;
                        let passesNormalAf = self.matchAndPassFilter(self.getFilterField(this.SOMATIC_FILTER, this.NORMAL_FREQ, 'currLogic'), currNormAf, self.getAdjustedCutoff(self.getFilterField(this.SOMATIC_FILTER, this.NORMAL_FREQ, 'currVal'), this.NORMAL_FREQ));
                        if (currFeat.id != null && passesNormalCount && passesNormalAf) {
                            passesNormalFiltersLookup[currFeat.id] = true;
                        }
                    }
                }
            });

            // Mark somatic and inherited variants
            let coverageCheckFeatures = {};
            for (i = 0; i < tumorSamples.length; i++) {
                let currTumor = tumorSamples[i];
                if (globalMode || (currTumor.currData && currTumor.currData.features && currTumor.currData.features.length > 0)) {
                    let tumorFeatures = [];
                    if (globalMode) {
                        let matchingFeatureList = featuresList.filter(list => {
                            return list.name === currTumor.model.selectedSample;
                        });
                        tumorFeatures = matchingFeatureList[0].features;
                    } else {
                        tumorFeatures = currTumor.currData.features;
                    }
                    // Don't need to look at tumor features that don't pass other filters
                    let filteredTumorFeatures = tumorFeatures.filter((feature) => {
                        return feature.passesFilters === true;
                    });
                    filteredTumorFeatures.forEach((feature) => {
                        let passesTumorCount = false;

                        // If we're pulling back from annotateSomaticVars, we've already filtered based on counts
                        if (globalMode) {
                            passesTumorCount = true;
                        } else {
                            passesTumorCount = self.matchAndPassFilter(self.getFilterField(this.SOMATIC_FILTER, this.TUMOR_COUNT, 'currLogic'), feature.genotypeAltCount, self.getFilterField(this.SOMATIC_FILTER, this.TUMOR_COUNT, 'currVal'));
                        }
                        let currAltFreq = Math.round(feature.genotypeAltCount / feature.genotypeDepth * 100) / 100;
                        let passesTumorAf = self.matchAndPassFilter(self.getFilterField(this.SOMATIC_FILTER, this.TUMOR_FREQ, 'currLogic'), currAltFreq, self.getAdjustedCutoff(self.getFilterField(this.SOMATIC_FILTER, this.TUMOR_FREQ, 'currVal'), this.TUMOR_FREQ));

                        if (passesNormalFiltersLookup[feature.id] && passesTumorAf && passesTumorCount) {
                            // Found a somatic variant
                            feature.isInherited = false;
                            somaticVarLookup[feature.id] = true;
                            (somaticVarMap[currTumor.model.selectedSample].features).push(feature);
                            inheritedVarLookup[feature.id] = false;
                        } else if (normalContainsLookup[feature.id] == null && passesTumorAf && passesTumorCount) {
                            if (globalMode) {
                                feature.isInherited = false;
                                somaticVarLookup[feature.id] = true;
                                (somaticVarMap[currTumor.model.selectedSample].features).push(feature);
                                inheritedVarLookup[feature.id] = false;
                            } else {
                                coverageCheckFeatures[feature.id] = {
                                    'chrom': feature.chrom,
                                    'start': feature.start,
                                    'end': feature.end,
                                    'id': feature.id
                                };
                            }
                        } else if (passesOtherFiltersLookup[feature.id]) {
                            // We have an inherited variant
                            feature.isInherited = true;
                            inheritedVarLookup[feature.id] = true;
                        } else {
                            // Else, we don't pass some sort of quality filter
                            // Or we aren't in the normal lookup
                            // Or we are in the normal lookup but we don't pass Tumor criteria

                            feature.isInherited = null;
                            inheritedVarLookup[feature.id] = false;

                            // Have to mark actual variant in normal sample as null b/c that's what feature matrix tooltips look at
                            if (normalContainsLookup[feature.id]) {
                                normalSamples[0].model.variantIdHash[feature.id].isInherited = null;
                            }
                        }
                    })
                }
            }
            // If we're in global mode, we don't have the bandwidth to get reads for all vars at once
            // Instead, these will be pulled in piece-meal like rnaseq/atacseq
            if (globalMode) {
                coverageCheckFeatures = {};
            }
            let coverageCheckList = Object.values(coverageCheckFeatures);
            if (coverageCheckList.length > 0) {
                const qualityCutoff = self.translator.globalApp.INDIV_QUALITY_CUTOFF;
                // Check coverage in normal sample (todo: update for multiple normal samples in the future)
                normalSamples[0].model.promiseGetBamDepthForVariants(coverageCheckList, self.translator.globalApp.COVERAGE_TYPE, qualityCutoff)
                    .then(coverageMap => {
                        for (var featId in coverageMap) {
                            let depth = coverageMap[featId];    // coverageMap respects order
                            let depthObj = self.filters[self.QUAL_FILTER].filter(filt => {
                                return filt.name === self.GENOTYPE_DEPTH;
                            });
                            if (depthObj.length <= 0) {
                                console.log('Something went wrong getting depth filter');
                            } else {
                                depthObj = depthObj[0];
                            }
                            // if (depth >= self.DEFAULT_QUALITY_FILTERING_CRITERIA['totalCountCutoff']) {
                            // todo: make sure synonymous then get rid of ^
                            if (self.matchAndPassFilter(depthObj.currLogic, depth, depthObj.currVal)) {

                                // Have to check to see if all of the tumor samples have this variant`
                                tumorSamples.forEach((sample) => {
                                    let tumorModel = sample.model;
                                    let matchingFeature = tumorModel.variantIdHash[featId];
                                    if (matchingFeature) {
                                        matchingFeature.isInherited = false;
                                        (somaticVarMap[tumorModel.selectedSample].features).push(matchingFeature);
                                    }
                                });
                                somaticVarLookup[featId] = true;
                                inheritedVarLookup[featId] = false;
                            } else {
                                let feature = coverageCheckList.filter(feat => {
                                    return feat.id === featId;
                                });
                                feature[0].isInherited = null;
                                inheritedVarLookup[featId] = false;  // Still need to mark this as false to display as undetermined in feature matrix
                            }
                            // Save the read count in the normal model for tooltip use so we don't have to access BAM again
                            normalSamples[0].model.somaticVarCoverage.push(coverageMap[featId]);
                        }
                        if (globalMode) {
                            resolve(somaticVarMap);
                        }
                        resolve({'somaticLookup': somaticVarLookup, 'inheritedLookup': inheritedVarLookup});
                    }).catch((error) => {
                    reject('Something went wrong in promiseAnnotateVariantInheritance: ' + error);
                })
            } else {
                if (globalMode) {
                    resolve(somaticVarMap);
                }
                resolve({'somaticLookup': somaticVarLookup, 'inheritedLookup': inheritedVarLookup});
            }
        })
    }

    getMatchingDepth(startCoord, depthList) {
        let lastDepth = 0;
        for (let i = 0; i < depthList.length; i++) {
            let listStart = depthList[i][0];
            let listDepth = depthList[i][1];
            if (startCoord === listStart) {
                lastDepth = listDepth;
                break;
            } else if (startCoord > listStart) {
                break;
            }
            lastDepth = listDepth;
        }
        return lastDepth;
    }

    matchAndPassFilter(logic, varVal, cutoffVal) {
        let passesFilter = false;
        varVal = parseFloat(varVal);
        cutoffVal = parseFloat(cutoffVal);
        switch (logic) {
            case '<': {
                passesFilter = varVal < cutoffVal;
                break;
            }
            case '<=': {
                passesFilter = varVal <= cutoffVal;
                break;
            }
            case '=': {
                passesFilter = varVal === cutoffVal;
                break;
            }
            case '>=': {
                passesFilter = varVal >= cutoffVal;
                break;
            }
            case '>': {
                passesFilter = varVal > cutoffVal;
                break;
            }
            default: {
                break;
            }
        }
        return passesFilter;
    }

    /* Need a special case here because of drop-down menu structure in Vue. */
    updateFilterLogic(filterName, newLogic) {
        const self = this;
        for (var filterCatName in self.filters) {
            let filterCat = self.filters[filterCatName];
            filterCat.forEach((filter) => {
                if (filter.name === filterName) {
                    filter.currLogic = newLogic;
                }
            })
        }
    }

    /* Takes in a list of variants, sets passesFilter field on each variant to true,
     * if it passes all of the current filter criteria within this model. */
    markFilteredVariants(variants) {
        const self = this;

        // Get active filters
        let checkboxFilters = self.getCheckboxFilters();

        variants.forEach(variant => {
            // Innocent until proven guilty
            variant.passesFilters = true;

            // Checkbox filters
            for (let i = 0; i < checkboxFilters.length; i++) {
                let filter = checkboxFilters[i];
                let field = filter[0];
                let value = filter[1];

                if (self.getVarField(variant, field) === value) {
                    variant.passesFilters = false;
                    break;
                }
            }
        });
    }

    /* Marks if filter is active or inactive. Used to control indicators in filter drawer. */
    setFilterState(parentFilterName, filterName, filterState) {
        const self = this;
        let filterObj = self.getFilterObject(parentFilterName, filterName);
        if (filterObj) {
            filterObj.active = filterState;
        }
    }

    /* Marks if larger category is active or inactive. Used to control indicators in filter drawer. */
    setCategoryState(categoryName, categoryState) {
        const self = this;
        let filterObj = self.filterCategories.filter((filt) => {
            return filt.name === categoryName;
        });
        if (filterObj.length > 0) {
            filterObj[0].active = categoryState;
        }
    }

    clearAllFilters() {
        const self = this;
        self.filterCategories.forEach((filter) => {
            filter.active = false;
        });
    }

    setModelFilter(id, key, entries) {
        this.modelFilters[id][key] = entries;
    }

    resetAllFiltersToDefault() {
        Object.values(this.filters).forEach(filterList => {
            filterList.forEach(filter => {
                if (filter.type === 'slider') {
                    filter.currLogic = filter.defaultLogic;
                    filter.currVal = filter.defaultVal;
                }
            });
        });
        Object.values(this.checkboxLists).forEach(listEntry => {
            listEntry.model = listEntry.default;
        })
    }

    /* Switches current logic to staged logic for all applicable filters. */
    commitStagedChanges() {
        Object.values(this.filters).forEach(filterList => {
            filterList.forEach(filter => {
                if (filter.type === 'slider') {
                    filter.prevLogic = filter.currLogic;
                    filter.prevVal = filter.currVal;
                }
            })
        })
    }

    removeStagedFilter(filterName) {
        Object.values(this.filters).forEach(filterList => {
            filterList.forEach(filter => {
                if (filter.name === filterName) {
                    filter.stagedLogic = null;
                    filter.stagedVal = null;
                    filter.currLogic = filter.prevLogic;
                    filter.currVal = filter.prevVal;
                }
            })
        })
    }

    /* Resets all staged changes to null */
    clearAllStagedChanges() {
        Object.values(this.filters).forEach(filterList => {
            filterList.forEach(filter => {
                if (filter.type === 'slider') {
                    filter.stagedLogic = null;
                    filter.stagedVal = null;
                    filter.currLogic = filter.prevLogic;
                    filter.currVal = filter.prevVal;
                }
            })
        })
    }

    /*** HELPERS ***/

    /* Returns appropriately formatted filter display name for chips/labels. */
    getFilterDisplayName(name, parentFilterName) {
        let filterDisplayName = '';
        if (parentFilterName === 'impact') {
            filterDisplayName = name.toLowerCase();
            filterDisplayName = filterDisplayName.charAt(0).toUpperCase() + filterDisplayName.slice(1);
            filterDisplayName += ' Impact';
        } else if (parentFilterName === 'type') {
            if (name !== 'SNP' && name !== 'MNP') {
                filterDisplayName = filterDisplayName.toLowerCase();
                filterDisplayName = filterDisplayName.charAt(0).toUpperCase() + filterDisplayName.slice(1);
            }
            filterDisplayName += 's';
        } else if (parentFilterName === 'frequencies') {
            filterDisplayName = name + ' Freq';
        } else {
            filterDisplayName = name;
        }
        return filterDisplayName;
    }

    getFilterObject(parentFilterName, filterName) {
        const self = this;

        let filterObj = self.filters[parentFilterName].filter((cat) => {
            return cat.name === filterName;
        });
        if (filterObj.length > 0) {
            return filterObj[0];
        } else {
            return null;
        }
    }

    getAdjustedCutoff(cutoffValue, filterName) {
        const filtersNeedAdjusting = {
            'tumorAltFreq': true,
            'normalAltFreq': true
        };
        if (filtersNeedAdjusting[filterName]) {
            return cutoffValue / 100;
        } else {
            return cutoffValue;
        }
    }

    getFilterField(parentFilterName, filterName, fieldName) {
        const self = this;
        let filterObj = self.getFilterObject(parentFilterName, filterName);
        return filterObj[fieldName];
    }

    getCheckboxFilters() {
        const self = this;
        let typesToHide = [];
        for (var listCatName in self.checkboxLists) {
            let currList = self.checkboxLists[listCatName];
            currList.forEach((filter) => {
                if (!filter.model) {
                    typesToHide.push([listCatName, filter.name]);
                }
            })
        }
        return typesToHide;
    }

    /* Returns filters that should be applied to tumor tracks.
     * Does NOT include 'somatic' filters because those are used
     * only for styling variants, not drawing/filtering out. */
    getTumorCutoffFilters() {
        const self = this;
        const tumorFilters = [];
        for (var filterCatName in self.filters) {
            if (filterCatName !== this.ANNOTATION_FILTER && filterCatName !== this.SOMATIC_FILTER) {
                const currFilters = self.filters[filterCatName];
                currFilters.forEach((currFilter) => {
                    if (currFilter.active) {
                        tumorFilters.push(currFilter);
                    }
                });
            }
        }
        return tumorFilters;
    }

    /* Returns filters that should be applied to normal tracks.
     * Does NOT include 'somatic' filters because those are used
     * only for styling variants, not drawing/filtering out. */
    getNormalCutoffFilters() {
        const self = this;
        const normalFilters = [];
        for (var filterCatName in self.filters) {
            if (filterCatName !== this.ANNOTATION_FILTER && filterCatName !== this.SOMATIC_FILTER) {
                const currFilters = self.filters[filterCatName];
                currFilters.forEach((currFilter) => {
                    if (!currFilter.tumorOnly && currFilter.active) {
                        normalFilters.push(currFilter);
                    }
                });
            }
        }
        return normalFilters;
    }

    /* Returns array of filter objects that are currently staged to recall somatic variants. */
    getActiveRecallFilters() {
        let recallFilters = [];
        this.filters[this.SOMATIC_FILTER].forEach(filter => {
            if (filter.stagedLogic && filter.stagedVal >= 0 &&
                !(filter.stagedLogic === filter.currLogic && filter.stagedVal === filter.stagedLogic))
                recallFilters.push(filter);
        });
        this.filters[this.QUAL_FILTER].forEach(filter => {
            if (filter.stagedLogic && filter.stagedVal >= 0 &&
                !(filter.stagedLogic === filter.currLogic && filter.stagedVal === filter.stagedLogic))
                recallFilters.push(filter);
        });
        return recallFilters;
    }


    /* Returns current values for all active filters, not just those used in somatic calling. */
    getActiveImplementedFilters() {
        let activeFilters = [];
        Object.values(this.filters).forEach(filterList => {
            filterList.forEach(filter => {
                if (filter.active) {
                    activeFilters.push(filter);
                }
            })
        });
        return activeFilters;
    }

    /* Returns the value of the variant according to the field name argument.
     * Sometimes these need a bit of translating - if not, returns simple value according to key. */
    getVarField(variant, fieldName) {
        if (!variant) {
            console.log('Could not retrieve field from variant');
        } else {
            if (fieldName === 'impact') {
                let impactObj = variant['highestImpactVep'];
                let keys = Object.keys(impactObj);
                return (impactObj && keys.length > 0) ? keys[0] : null;
            } else if (variant[fieldName] == null) {
                console.log('Could not retrieve field from variant');
            } else {
                return variant[fieldName];
            }
        }
    }

    /* Takes in arrays of normal and tumor selected sample idxs (see Sample Model constructor for definitions). */
    getSomaticCallingCriteria(normalSelSampleIdxs, tumorSelSampleIdxs) {
        const self = this;

        let criteria =  {
            'normalSampleIdxs': normalSelSampleIdxs,
            'tumorSampleIdxs': tumorSelSampleIdxs,
            'totalSampleNum': normalSelSampleIdxs.length + tumorSelSampleIdxs.length
        };

        self.filters[self.SOMATIC_FILTER].forEach(filter => {
            criteria[filter.name] = filter.currVal;
            criteria[filter.name + '_LOGIC'] = filter.currLogic;
        });
        self.filters[self.QUAL_FILTER].forEach(filter => {
            criteria[filter.name] = filter.currVal;
            criteria[filter.name + '_LOGIC'] = filter.currLogic;
        });

        return criteria;
    }

    /* Returns final filtering phrase, including depth and quality, for filtering somatic variants. */
    getSomaticFilterPhrase(normalSelSampleIdxs, tumorSelSampleIdxs) {
        const somaticCriteria = this.getSomaticCallingCriteria(normalSelSampleIdxs, tumorSelSampleIdxs);
        const normalPhrase = this.getNormalFilterPhrase(normalSelSampleIdxs, somaticCriteria);
        const tumorPhrase = this.getTumorFilterPhrase(tumorSelSampleIdxs, somaticCriteria);
        const samplePhrase = '(' + normalPhrase + ')&&(' + tumorPhrase + ')';
        const qualPhrase = '(QUAL' + somaticCriteria[this.QUAL_LOGIC] + somaticCriteria[this.QUAL_CUTOFF] + ')';

        return qualPhrase + '&&' + samplePhrase;
    }

    /* Returns normal(non-tumor) filtering phrase for normal samples based on current somatic criteria.
     * NOTE: hardcoded for Freebayes right now, need to determine if Freebayes of GATK and incorporate logic. */
    getNormalFilterPhrase(normalSelSampleIdxs, somaticCriteria) {
        let normalPhrase = '';
        for (let i = 0; i < normalSelSampleIdxs.length; i++) {
            const idx = normalSelSampleIdxs[i];
            if (i > 0) {
                normalPhrase += '||';
            }
            //todo: add in logic for dropdown selection (aka from filter logicObj)
            normalPhrase += '(FORMAT/AO[' + idx + ':0]' + somaticCriteria[this.NORMAL_COUNT_LOGIC] + somaticCriteria[this.NORMAL_COUNT];
            normalPhrase += '&FORMAT/DP[' + idx + ':0]' + somaticCriteria[this.DEPTH_LOGIC] + somaticCriteria[this.GENOTYPE_DEPTH] + ')';
            normalPhrase += '||(FORMAT/DP[' + idx + ':0]=\".\")';
            // todo: get rid of
            //normalPhrase += '||FORMAT/AO[' + idx + ':0]/FORMAT/DP[' + idx + ':0]<=' + (somaticCriteria['normalAfCutoff']).toFixed(2);
        }
        return normalPhrase;
    }

    /* Returns tumor filtering phrase for normal samples based on current somatic criteria.
     * NOTE: hardcoded for Freebayes right now, need to determine if Freebayes of GATK and incorporate logic. */
    getTumorFilterPhrase(tumorSelSampleIdxs, somaticCriteria) {
        let tumorPhrase = '';
        for (let i = 0; i < tumorSelSampleIdxs.length; i++) {
            const idx = tumorSelSampleIdxs[i];
            if (i > 0) {
                tumorPhrase += '||';
            }
            tumorPhrase += '(FORMAT/AO[' + idx + ':0]' + somaticCriteria[this.TUMOR_COUNT_LOGIC] + somaticCriteria[this.TUMOR_COUNT];
            tumorPhrase += '&FORMAT/DP[' + idx + ':0]' + somaticCriteria[this.DEPTH_LOGIC] + somaticCriteria[this.GENOTYPE_DEPTH] + ')';
            // todo: get rid of
            //tumorPhrase += '||FORMAT/AO[' + idx + ':0]/FORMAT/DP[' + idx + ':0]>=' + (somaticCriteria['tumorAfCutoff']).toFixed(2);
        }
        return tumorPhrase;
    }
}

export default FilterModel;
