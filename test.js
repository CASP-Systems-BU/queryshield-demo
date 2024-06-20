share0 = `[AGE]_0,[AGE]_1,[#V]_0,[#V]_1,[REGION]_0,[REGION]_1,[EMPLOYEE_ID]_0,[EMPLOYEE_ID]_1
1085817336,-966741943,-670634841,2125877937,-927399322,-1406940582,-1733304430,579397302
1400663273,-979706777,-1853896288,214675086,384547568,107088222,470058410,2117469627
794584073,-649384776,1972228080,-307862063,81906893,1503528881,1218472046,-2076607938`

share1 = `[AGE]_0,[AGE]_1,[#V]_0,[#V]_1,[REGION]_0,[REGION]_1,[EMPLOYEE_ID]_0,[EMPLOYEE_ID]_1
-2032602712,1085817336,-1498366441,-670634841,1687865361,-927399322,-1171834587,-1733304430
-1763266416,1400663273,-1649121489,-1853896288,277459944,384547568,1647476755,470058410
-166246254,794584073,-1741968864,1972228080,1568656209,81906893,-862383533,1218472046`

share2 = `[AGE]_0,[AGE]_1,[#V]_0,[#V]_1,[REGION]_0,[REGION]_1,[EMPLOYEE_ID]_0,[EMPLOYEE_ID]_1
-966741943,-2032602712,2125877937,-1498366441,-1406940582,1687865361,579397302,-1171834587
-979706777,-1763266416,214675086,-1649121489,107088222,277459944,2117469627,1647476755
-649384776,-166246254,-307862063,-1741968864,1503528881,1568656209,-2076607938,-862383533`

academiaData = `OutTable_0,[Academia]_0,[AvgSalary]_0,[AvgYears]_0,[Degree]_0,[Region]_0,[YearGroups]_0
1,0,263560,23,0,0,0
1,0,259529,20,1,0,0
1,0,248866,16,2,0,0
1,0,270120,19,3,0,0
1,0,234074,20,4,0,0
2,0,222352,0,0,0,1
2,0,230690,0,0,0,2
2,0,250728,0,0,0,6
2,0,227248,0,0,0,14
2,0,247520,0,0,0,30
2,0,269695,0,0,0,62
3,0,210651,20,0,0,0
3,0,239880,17,0,1,0
3,0,246657,18,0,2,0
3,0,263001,14,0,3,0
3,0,285249,24,0,4,0
3,0,276009,17,0,5,0
3,0,291104,21,0,6,0
3,0,273515,20,0,7,0
3,0,254983,21,0,8,0
3,0,262156,20,0,9,0
3,0,217529,15,0,10,0
3,0,226418,19,0,11,0
3,0,333340,23,0,12,0
3,0,116855,23,0,13,0
3,0,353813,15,0,14,0
3,0,313051,25,0,15,0
3,0,191219,15,0,16,0
3,0,308648,19,0,17,0
3,0,337342,20,0,18,0
3,0,281461,21,0,19,0
3,0,232881,27,0,20,0
3,0,307400,23,0,21,0
3,0,261682,22,0,22,0
3,0,198744,18,0,23,0
3,0,210112,16,0,24,0
3,0,156550,20,0,25,0
3,0,275585,19,0,26,0
4,0,255448,19,0,0,0
4,1,254892,20,0,0,0`

function reconstructShares(resultSharesList) {
    let resultSharesCleaned = Array(resultSharesList.length)
    let columnNames = null
    let i = 0

    // iterate over each party's shares
    resultSharesList.forEach(resultShares => {
        // split into lines, then split lines into words
        const lines = resultShares.trim().split("\n");
        const words = lines.map(line => line.split(','))

        // filter out duplicate unnecessary shares
        // detect unnecessary shares by the _1 or _2 after the name
        let goodColumns = []
        let goodColumnNames = []
        for (let j = 0; j < words[0].length; j++) {
            if (words[0][j].includes("_0")) {
                goodColumns.push(j)
                goodColumnNames.push(words[0][j].slice(0, -2))
            }
        }
        if (columnNames == null) {
            columnNames = goodColumnNames
        }

        const matrix = math.matrix(lines.map(line => line.split(',').map(Number)));

        // select only the good columns
        let filteredMatrix = math.zeros(matrix.size()[0], 0);
        goodColumns.forEach(i => {
            filteredMatrix = math.concat(filteredMatrix, matrix.subset(math.index(math.range(0, matrix.size()[0]), i)), 1);
        });

        const numRows = math.size(matrix)._data[0]

        // convert to uint32 type to avoid issues with native JS numbers
        let uint32matrix = Array(numRows - 1)
        for (let row = 1; row < numRows; row++) {
            uint32matrix[row - 1] = new Uint32Array(filteredMatrix.toArray()[row])
        }

        resultSharesCleaned[i] = uint32matrix
        i++
    });

    const numRows = resultSharesCleaned[0].length
    const numCols = resultSharesCleaned[0][0].length

    let result = Array(numRows)
    for (let i = 0; i < result.length; i++) {
        result[i] = new Uint32Array(numCols)
    }

    for (let col = 0; col < numCols; col++) {
        for (let row = 0; row < numRows; row++) {
            let ret = 0
            // decide between binary and arithmetic reconstruction based on [ or [[, respectively
            if (columnNames[col].includes("[[")) {
                // arithmetic
                for (let share = 0; share < resultSharesCleaned.length; share++) {
                    let value = resultSharesCleaned[share][row][col]
                    ret = (ret + value) % 2**32
                }
            } else if (columnNames[col].includes("[")) {
                // binary
                for (let share = 0; share < resultSharesCleaned.length; share++) {
                    let value = resultSharesCleaned[share][row][col]
                    ret ^= value
                }
            } else {
                // plaintext
                ret = resultSharesCleaned[0][row][col]
            }
            result[row][col] = ret
        }
    }

    // return both the column names and the reconstructed data
    return [columnNames, result]
}

function filterValidBit(columnNames, data) {
    // check if there is a valid bit and find it
    let validColumn = -1
    for (let i = 0; i < columnNames.length; i++) {
        if (columnNames[i].includes('#V')) {
            validColumn = i
            break
        }
    }
    // if no valid column, I don't think this should ever happen
    if (validColumn == -1) {
        return data
    }

    let filteredRows = []
    for (let row = 0; row < data.length; row++) {
        if (data[row][validColumn] == 1) {
            let newRow = new Uint32Array(columnNames.length-1)
            let index = 0
            for (let i = 0; i < columnNames.length; i++) {
                if (i != validColumn) {
                    newRow[index] = data[row][i];
                    index++;
                }
            }
            filteredRows.push(newRow)
        }
    }

    return filteredRows
}

function secret_share(data, numParties) {
    let shares = [];
    for (let i = 0; i < numParties-1; i++) {
        let share = new BigUint64Array(1);
        crypto.getRandomValues(share);
        shares.push(share[0]);
    }
    let lastShare = new BigUint64Array(1);
    if (typeof (data) === 'string') {
        lastShare[0] = 0n;
        for (let i = 0; i < numParties-1; i++) {
            lastShare[0] = lastShare[0] ^ shares[i];
        }
        lastShare[0] ^= BigInt(data)
    } else if (typeof (data === 'number')) {
        lastShare[0] = 0n;
        for (let i = 0; i < numParties-1; i++) {
            lastShare[0] = lastShare[0] - shares[i];
        }
        lastShare[0] += BigInt(data)
    }
    shares.push(lastShare[0])
    return shares
}

function separateWageGapTables(data) {
    // separate tables
    degreeData = []
    yoeData = []
    regionData = []
    academiaData = []
    for (let row = 0; row < data.length; row++) {
        switch (data[row][0]) {
            case 1:
                degreeData.push(data[row])
                break
            case 2:
                yoeData.push(data[row])
                break
            case 3:
                regionData.push(data[row])
                break
            case 4:
                academiaData.push(data[row])
                break
        }
    }
    console.log(degreeData)
    console.log(yoeData)
    console.log(regionData)
    console.log(academiaData)
    return [degreeData, yoeData, regionData, academiaData]
}

function makeBarGraph(ctx, title, labels, values) {
    chartData = []
    for (let i = 0; i < labels.length; i++) {
        bar = {
            label: labels[i],
            data: [values[i]]
        }
        chartData.push(bar)
    }
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [title],
            datasets: chartData
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function generateChartWageGap(tables) {
    let degreeData = tables[0]
    let yoeData = tables[1]
    let regionData = tables[2]
    let academiaData = tables[3]

    // ACADEMIA
    let academiaLabels = ['Industry', 'Academia']

    const academiaWageCtx = document.getElementById('academiaWageChart').getContext('2d')
    let academiaWageValues = [academiaData[0][2], academiaData[1][2]]
    makeBarGraph(academiaWageCtx, 'Wages: Industry vs. Academia', academiaLabels, academiaWageValues)

    const academiaYoeCtx = document.getElementById('academiaYoeChart').getContext('2d')
    let academiaYoeValues = [academiaData[0][3], academiaData[1][3]]
    makeBarGraph(academiaYoeCtx, 'Years of Experience: Industry vs. Academia', academiaLabels, academiaYoeValues)

    // DEGREE
    let degreeLabels = ['No College', 'Undergraduate', 'Graduate', 'Doctorate', 'Other']

    const degreeWageCtx = document.getElementById('degreeWageChart').getContext('2d')
    let degreeWageValues = [degreeData[0][2], degreeData[1][2], degreeData[2][2], degreeData[3][2], degreeData[4][2]]
    makeBarGraph(degreeWageCtx, 'Wages by Highest Degree', degreeLabels, degreeWageValues)

    const degreeYoeCtx = document.getElementById('degreeYoeChart').getContext('2d')
    let degreeYoeValues = [degreeData[0][3], degreeData[1][3], degreeData[2][3], degreeData[3][3], degreeData[4][3]]
    makeBarGraph(degreeYoeCtx, 'Years of Experience by Highest Degree', degreeLabels, degreeYoeValues)

    // REGION
    const regionWageCtx = document.getElementById('regionWageChart').getContext('2d')
    const regionYoeCtx = document.getElementById('regionYoeChart').getContext('2d')
    let regionLabels = ['United States', 'Canada', 'Central America', 'Caribbean', 'South America', 'Northern Europe', 'Western Europe', 'Southern Europe', 'Eastern Europe', 'Central Asia', 'South Asia', 'East Asia', 'Southeast Asia', 'MiddleEast', 'Oceania', 'Australia', 'NewZealand', 'Northern Africa', 'Western Africa', 'Central Africa', 'Eastern Africa', 'Southern Africa', 'Other']
    let regionWageValues = []
    let regionYoeValues = []
    for (let i = 0; i < regionData.length; i++) {
        regionWageValues.push(regionData[i][2])
        regionYoeValues.push(regionData[i][3])
    }
    makeBarGraph(regionWageCtx, 'Wages by Region', regionLabels, regionWageValues)
    makeBarGraph(regionYoeCtx, 'Years of Experience by Region', regionLabels, regionYoeValues)

    // YOE
    const yoeCtx = document.getElementById('yoeChart').getContext('2d')
    let yoeLabels = ['0', '1-2', '3-5', '6-10', '11-20', '>20']
    let yoeValues = [yoeData[0][2], yoeData[1][2], yoeData[2][2], yoeData[3][2], yoeData[4][2], yoeData[5][2]]
    makeBarGraph(yoeCtx, 'Years of Experience', yoeLabels, yoeValues)
}

function visualization(columnNames) {
    let columns = []
    for (let i = 0; i < columnNames.length; i++) {
        columns.push({
            title: columnNames[i].replace('[', '').replace(']', ''),
            type: "numeric",
            width: 200
        })
    }
    return columns
}

resultSharesList = [share0, share1, share2]
//resultSharesList = [academiaData, academiaData, academiaData]
ret = reconstructShares(resultSharesList)
console.log(ret[0])
for (let i = 0; i < ret[0].length; i++) {
    if (ret[0][i].includes('AvgSalary')) {
        console.log("YAY")
    }
}
console.log(ret[1])
filteredData = filterValidBit(ret[0], ret[1])
console.log(filteredData)
console.log(visualization(ret[0]))

//generateChartWageGap(separateWageGapTables(filteredData))
