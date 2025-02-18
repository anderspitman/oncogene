// class to interact with backend for CNV files
// ideally these files are generated by the Facets program by MSKCC
class cnviobio {
    constructor(theEndpoint) {
        this.endpoint = theEndpoint;
        this.rawLines = null;
        this.headerIndices = null;
        this.startCoords = []; // index is chr, entry is sub-array of start coords [[22224, 22229, ...]
        this.cnvData = [];   // index is chr, entry is sub-array of maps of start, end, tcn, lcn [[{start: 21200, end: 22229, tcn: lcn: }, {start: 21200, end: 23457, tcn: lcn:}, ....]]
        this.dataLoaded = false;
        this.selectedSample = null;
        this.REQ_FIELDS = ['chrom', 'start', 'end', 'tcn.em', 'lcn.em'];
    }

    init() {
        for (let i = 0; i < 25; i++) {
            this.startCoords[i] = [];
            this.cnvData[i] = [];
        }
    }

    /* Returns true if all required CNV headers are present in provided file url. */
    checkCnvFormat(url, callback) {
        const self = this;
        self.endpoint.promiseGetCnvData(url)
            .then((buffer) => {
                const lines = buffer.split('\n');
                self.rawLines = lines.slice(1, (lines.length - 1));
                const headers = lines[0];
                let fieldIdx = this.checkHeaders(headers);
                self.headerIndices = fieldIdx;
                let notFoundFlag = false;
                fieldIdx.forEach(idx => {
                    if (idx < 0) {
                        notFoundFlag = true;
                    }
                });
                if (!notFoundFlag) {
                    callback(true);
                } else {
                    callback(false, 'badHeaders');
                }
            })
            .catch((error) => {
                console.log('Something went wrong with getting the CNV data: ' + error);
                callback(false, 'badFetch');
            })
    }

    /* Returns indices of required fields for CNV file header. */
    checkHeaders(headerLine) {
        if (headerLine.startsWith('#')) {
            headerLine = headerLine.substring(1);
        }
        const tokens = headerLine.split('\t');
        let fieldIdx = [];
        this.REQ_FIELDS.forEach(() => {
            fieldIdx.push(-1);
        });
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            for (let j = 0; j < this.REQ_FIELDS.length; j++) {
                let field = this.REQ_FIELDS[j];
                if (field.toLowerCase() === token) {
                    fieldIdx[j] = i;
                }
            }
        }
        fieldIdx.forEach((idx) => {
            if (idx < 0) {
                return null;
            }
        });
        return fieldIdx;
    }

    /* Populates map in this with each line from CNV file, grouped by chromosome. */
    promiseParseCnvData() {
        const self = this;
        if (self.dataLoaded) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            self.rawLines.forEach((line) => {
                let tokens = line.split('\t');
                let currChr = tokens[self.headerIndices[0]];
                let adjChr = currChr;
                if (currChr === 'X') {
                    adjChr = 24;
                } else if (currChr === 'Y') {
                    adjChr = 25;
                }

                self.startCoords[adjChr - 1].push(tokens[self.headerIndices[1]]);
                let otherData = {
                    chr: +currChr,
                    start: +tokens[self.headerIndices[1]],
                    end: +tokens[self.headerIndices[2]],
                    tcn: +tokens[self.headerIndices[3]],
                    lcn: +tokens[self.headerIndices[4]]
                };
                self.cnvData[adjChr - 1].push(otherData);
            });
            self.dataLoaded = true;
            resolve();
        })
    }

    // Two options here - multiple lines encompass our given section
    // or our section falls within one CNV event
    // Returns a single continuous CNV (for viz purposes) as well as a list of the individual ones covering the gene
    // If abnormalOnly is true, returns only CNVs where TCN != 2
    // NOTE: ASSUMES NON-OVERLAPPING CNVs PROVIDED PER FACETS
    findEntryByCoord(chr, startCoord, endCoord, abnormalOnly = false) {
        let cnvObj = {
            matchingCnvs: [],
            mergedCnv: []
        };

        // Synonimize chromosome nomenclature
        if (chr.indexOf('c') > -1) {
            chr = chr.substring(3);
        }
        if (chr === 'X') {
            chr = 24;
        } else if (chr === 'Y') {
            chr = 25;
        }

        const chrStarts = this.startCoords[chr - 1];
        const chrData = this.cnvData[chr - 1];

        // Don't start searching if our first section is > our coord
        if (chrStarts.length === 0 || chrStarts[0] > startCoord) {
            return cnvObj;
        }

        // Search intervals for matching start
        for (let i = 0; i < chrStarts.length; i++) {
            if (chrData[i].start > endCoord) {
                break;
            }
            // If we only want abnormal CNVs, perform check before adding
            let abnormalSatisfied = abnormalOnly ? ((+chrData[i].tcn) !== 2) : true;

            // We're in a gene encompasses by a CNV larger than the entire gene
            if (startCoord >= chrStarts[i] && endCoord <= chrData[i].end && abnormalSatisfied) {
                cnvObj.matchingCnvs.push(this._getFormattedData(chrData[i], startCoord, endCoord));
            // We've found an element that encompasses some of the 5' part of the gene
            } else if (startCoord >= chrStarts[i] && chrData[i].end <= endCoord && chrData[i].end > startCoord && abnormalSatisfied) {
                cnvObj.matchingCnvs.push(this._getFormattedData(chrData[i], startCoord, endCoord));
            // We've found an event that starts within our gene and encompasses some of the 3' part
            } else if (startCoord <= chrStarts[i] && chrStarts[i] < endCoord && chrData[i].end >= endCoord && abnormalSatisfied) {
                cnvObj.matchingCnvs.push(this._getFormattedData(chrData[i], startCoord, endCoord));
            // We've found a tiny CNV within the gene
            } else if (startCoord <= chrStarts[i] && chrData[i].end <= endCoord && abnormalSatisfied) {
                cnvObj.matchingCnvs.push(this._getFormattedData(chrData[i], startCoord, endCoord));
            }
        }

        cnvObj.mergedCnv = this._mergeCnvs(cnvObj.matchingCnvs);
        return cnvObj;
    }

    // Returns a list of CNVs with only one joined entry. The TCN and LCN fields will be set to the MAX value within array.
    // and start and end will be the smallest and largest coordinates to encompass all points, respectively.
    _mergeCnvs(cnvList) {
        let retList = [];

        // Make deep copy
        let firstObj = {
            tcn: 0,
            lcn: 0,
            points: [],
            delimiters: [], // The start and stop points of CNV events composing this single merged CNV
            start: Number.MAX_SAFE_INTEGER,
            end: 0
        };
        retList.push(firstObj);

        // Append all other points to first and update end coord
        for (let i = 0; i < cnvList.length; i++) {
            let cnvObj = cnvList[i];
            firstObj.delimiters.push([cnvObj.start, cnvObj.end])

            firstObj.points = firstObj.points.concat(cnvObj.points);
            if (cnvObj.end > firstObj.end) {
                firstObj.end = cnvObj.end;
            }
            if (cnvObj.start < firstObj.start) {
                firstObj.start = cnvObj.start;
            }
            if (cnvObj.tcn > firstObj.tcn) {
                firstObj.tcn = cnvObj.tcn;
            }
            // sometimes lcn is NA
            if (cnvObj.lcn >= 0 && cnvObj.lcn > firstObj.lcn) {
                firstObj.lcn = cnvObj.lcn;
            }
        }
        return retList;
    }

    /* Returns CNV data object with the following fields:
     * start, end, tcn, lcn, and points
     * where points is an array every 1000bp between start and end with { coord lcn/tcn ratio } */
    _getFormattedData(data, geneStart, geneEnd) {
        let points = [];

        // Adjust points to be long enough to cover region buffer
        const regionBuffer = 0;
        geneStart -= regionBuffer;
        geneEnd += regionBuffer;
        // todo: regionBuffer needs to actually be piped in here

        // Get right most start point
        let start = Math.max(geneStart, +data.start);

        // Get left most end point
        let end = Math.min(geneEnd, +data.end);

        let lastIndex = start;
        for (let i = start; i < end; i += 1000) {
            points.push({ coord: i, ratio: (+(data.lcn/data.tcn).toFixed(2)), tcn: +data.tcn, lcn: +data.lcn });
            lastIndex = i;
        }

        // Always add on end coord if > last point
        if (end > lastIndex) {
            points.push({ coord: end, ratio: (+(data.lcn/data.tcn).toFixed(2)), tcn: +data.tcn, lcn: +data.lcn });
        }

        data.points = points;
        return data;
    }
}

export default cnviobio