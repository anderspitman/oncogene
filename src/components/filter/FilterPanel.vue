<!--Adapted from gene.iobio and TDS Aug2018, prev FilterSettings.vue in Cohort-->
<style lang="sass">
    .filter-form
        .input-group
            label
                font-size: 13px

        .filter-loader
            padding-top: 4px
            padding-right: 7px
            max-width: 25px
            margin: 0 !important

        img
            width: 18px !important
</style>

<template>
    <v-layout row wrap>
        <v-flex id="name" xs12 class="mb-3">
            <v-expansion-panels multiple style="background-color: transparent !important">
                <v-expansion-panel v-for="filter in filterModel.filters[filterName]"
                                   :ref="filter.name + 'ExpansionRef'"
                                   :key="filter.name"
                                   :value="filter.open"
                                   :disabled="(somaticOnlyMode && !displaySomaticOnly)"
                                    style="background-color: transparent">
                    <v-expansion-panel-header style="background-color: transparent; font-family: Quicksand">
                        <div>
                            <div class="text-center d-inline">
                                <v-avatar v-if="filter.active && !somaticOnlyMode" size="12px" color="secondary"
                                          style="margin-right: 10px"></v-avatar>
                                <v-avatar v-else-if="!filter.active || !annotationComplete" size="10px" color="translucent"
                                          style="margin-right: 12px"></v-avatar>
                                    <span class="filter-title">
                                    {{ filter.display }}
                                </span>
                            </div>
                        </div>
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <v-card flat color="transparent">
                            <filter-panel-checkbox
                                    v-if="filter.type==='checkbox'"
                                    ref="filtCheckRef"
                                    :parentFilterName="filter.name"
                                    :grandparentFilterName="filterName"
                                    :annotationComplete="annotationComplete"
                                    :checkboxLists="filterModel.checkboxLists"
                                    @filter-toggled="onFilterToggled">
                            </filter-panel-checkbox>
                            <filter-panel-slider
                                    v-if="filter.type==='slider'"
                                    ref="filtSliderRef"
                                    :logicObj="filter"
                                    :annotationComplete="annotationComplete"
                                    :applyFilters="applyFilters"
                                    @update-slider-logic="onSliderLogicChange"
                                    @filter-slider-changed="onFilterChange(filter.recallFilter)">
                            </filter-panel-slider>
                            <filter-panel-cutoff
                                    v-else-if="filter.type==='cutoff'"
                                    ref="filterCutoffRef"
                                    :filterName="filter.name"
                                    :parentFilterName="filterName"
                                    :annotationComplete="annotationComplete"
                                    @filter-applied="onFilterChange(filter.recallFilter)"
                                    @cutoff-filter-cleared="onFilterChange">
                            </filter-panel-cutoff>
                        </v-card>
                    </v-expansion-panel-content>
                </v-expansion-panel>
            </v-expansion-panels>
        </v-flex>
    </v-layout>
</template>

<script>
    import FilterPanelCheckbox from './FilterPanelCheckbox.vue'
    import FilterPanelCutoff from './FilterPanelCutoff.vue'
    import FilterPanelSlider from './FilterPanelSlider.vue'

    export default {
        name: 'filter-panel',
        components: {
            FilterPanelCheckbox,
            FilterPanelCutoff,
            FilterPanelSlider
        },
        props: {
            filter: null,
            filterName: null,
            filterModel: null,
            idx: null,
            annotationComplete: {
                type: Boolean,
                default: false
            },
            applyFilters: {
                type: Boolean,
                default: false
            },
            somaticOnlyMode: {
                type: Boolean,
                default: false
            },
            displaySomaticOnly: {
                type: Boolean,
                default: false
            }
        },
        data() {
            return {
                theFilter: null,
                name: null,
                maxAf: null,
                selectedClinvarCategories: null,
                selectedImpacts: null,
                selectedZygosity: null,
                selectedInheritanceModes: null,
                selectedConsequences: null,
                minGenotypeDepth: null
            }
        },
        methods: {
            onSliderLogicChange: function (filterName, newLogic, recallFilter) {
                const self = this;
                self.filterModel.updateFilterLogic(filterName, newLogic);
                self.$emit('filter-change', recallFilter);
            },
            onFilterChange: function (recallFilter) {
                const self = this;
                self.$emit('filter-change', recallFilter);
            },
            onFilterToggled: function(checkboxCategory) {
                const self = this;
                self.filterModel.updateCheckboxParentsStatus(checkboxCategory);
                self.$emit('filter-change');
            }
        }
    }
</script>