// class to interact with backend for facets files
class cnviobio {
    constructor(theEndpoint) {
       this.endpoint = theEndpoint;
       this.startCoords = []; // index is chr, entry is sub-array of start coords [[22224, 22229, ...]
       this.cnvData = [];   // index is chr, entry is sub-array of maps of end, tcn, lcn [[{end: 22229, tcn: lcn: }, {end: 23457, tcn: lcn:}, ....]]
       this.REQ_FIELDS = ['chrom', 'start', 'end', 'tcn.em', 'lcn.em'];
    }

    init() {
        for (let i = 0; i < 25; i++) {
            this.startCoords[i] = [];
            this.cnvData[i] = [];
        }
    }

    checkCnvFormat(url, callback) {
        this.endpoint.promiseGetCnvData(url)
            .then((buffer) => {
                const lines = buffer.split('\n');
                const headers = lines[0];
                let fieldIdx = this.checkHeaders(headers);
                if (fieldIdx) {
                    this.parseCnvData(lines, fieldIdx);
                    callback(true);
                } else {
                    callback(false, 'badHeaders');
                }
                console.log(buffer);
            })
            .catch((error) => {
                console.log('Something went wrong with getting the CNV data: ' + error);
                callback(false, 'badFetch');
            })
    }

    checkHeaders(headerLine) {
        const tokens = headerLine.split('\t');
        let fieldIdx = [-1, -1, -1, -1, -1];
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

    parseCnvData(lines, fieldIdx) {
        lines.forEach((line) => {
            let tokens = line.split('\t');
            let currChr = tokens[fieldIdx[0]];
            if (currChr === 'X') {
                currChr = 24;
            } else if (currChr === 'Y') {
                currChr = 25;
            }
            this.startCoords[currChr-1].push(tokens[fieldIdx[1]]);
            let otherData = {
                start: tokens[fieldIdx[1]],
                end: tokens[fieldIdx[2]],
                tcn: tokens[fieldIdx[3]],
                lcn: tokens[fieldIdx[4]]
            };
            this.cnvData[currChr-1].push(otherData);
        })
    }

    // Two options here - multiple lines encompass our given section
    // or our section falls within one CNV event
    findEntryByCoord(chr, startCoord, endCoord) {
        let matchingCnvs = [];

        const chrStarts = this.startCoords[chr-1];
        const chrData = this.cnvData[chr-1];

        // Don't start searching if our first section is > our coord
        if (chrStarts[0] > startCoord) {
            return matchingCnvs;
        }

        // Search intervals for matching start
        for (let i = 0; i < chrStarts.length; i++) {
            if (startCoord >= chrStarts[i]) {
                matchingCnvs.push(chrData[i]);
                if (endCoord < chrData[i].end) {
                    break;
                }
            } else {
                if (chrStarts[i] > endCoord) {
                    break;
                }
                matchingCnvs.push(chrData[i]);
                if (endCoord < chrData[i].end) {
                    break;
                }
            }
        }
        return matchingCnvs;
    }

    // findEntryByChrom(chr) {
    //     // todo: convenience method - get start/end coords and feed to above fxn
    // }
}
export default cnviobio