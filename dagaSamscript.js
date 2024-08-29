let combinedData = []; // Declare combinedData in the global scope

document.getElementById('uploadBtn').addEventListener('click', function() {
    const fileInput1 = document.getElementById('fileInput1');
    const fileInput2 = document.getElementById('fileInput2');
    const fileInput3 = document.getElementById('fileInput3');
    const fileInput4 = document.getElementById('fileInput4');
    const output = document.getElementById('output');
    output.innerHTML = ''; // Clear previous output

    // Collect files from each input
    const files = [
        fileInput1.files[0],
        fileInput2.files[0],
        fileInput3.files[0],
        fileInput4.files[0]
    ];

    // Check if all files are uploaded
    if (files.some(file => !file)) {
        alert('Please upload all four meter data CSV files.');
        return;
    }

    combinedData = []; // Reset combinedData for new uploads

    // Create an array of promises for reading each file
    const readPromises = files.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const text = event.target.result;
                const data = parseCSV(text);
                combinedData.push(data); // Push the whole array for each file
                resolve(); // Resolve the promise when done
            };
            reader.onerror = reject; // Handle errors
            reader.readAsText(file);
        });
    });

    // Wait for all files to be read before displaying the data
    Promise.all(readPromises).then(() => {
        displayData(combinedData, output); // Display all data initially
    }).catch(error => {
        console.error('Error reading files:', error);
        alert('An error occurred while reading the files.');
    });
});

document.getElementById('filterBtn').addEventListener('click', function() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const output = document.getElementById('output');
    output.innerHTML = ''; // Clear previous output

    const startDate = parseDateTime(startDateInput.value);
    const endDate = parseDateTime(endDateInput.value);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert('Please enter a valid date and time range.');
        return;
    }

    // Prepare to store the filtered data for each meter
    const filteredData = combinedData.map(meterData => {
        return meterData.filter(row => {
            if (row[0]) {
                const rowDate = new Date(row[0]);
                return rowDate >= startDate && rowDate <= endDate;
            }
            return false;
        });
    });

    displayData(filteredData, output); // Display filtered data
});

document.getElementById('downloadBtn').addEventListener('click', function() {
    const output = document.getElementById('output');
    const rows = output.innerHTML.split('<br>').filter(row => row.length > 0);
    
    // Prepare data for XLSX
    const data = rows.map(row => row.split(' | '));

    // Rearrange the columns based on the desired order
    const rearrangedData = data.map(row => [
        row[0], // Column 1 (Date)
        parseFloat(row[1]) || 0, // Column 2 (Number)
        parseFloat(row[4]) || 0, // Column 5 (Number)
        parseFloat(row[7]) || 0, // Column 8 (Number)
        parseFloat(row[10]) || 0, // Column 11 (Number)
        parseFloat(row[3]) || 0, // Column 4 (Number)
        parseFloat(row[2]) || 0, // Column 3 (Number)
        parseFloat(row[5]) || 0, // Column 6 (Number)
        parseFloat(row[8]) || 0, // Column 9 (Number)
        parseFloat(row[11]) || 0, // Column 12 (Number)
        parseFloat(row[6]) || 0, // Column 7 (Number)
        parseFloat(row[9]) || 0  // Column 10 (Number)
    ]);

    // Create a new workbook and a new worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rearrangedData);

    // Set number format for specific columns
    const numberFormatColumns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Columns 2, 5, 8, 11, 4, 3, 6, 9, 12, 7, 10 (0-indexed)
    numberFormatColumns.forEach(col => {
        for (let rowIndex = 0; rowIndex < rearrangedData.length; rowIndex++) {
            const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
            if (ws[cellAddress]) {
                ws[cellAddress].z = XLSX.SSF._table[4]; // Set to number format
            }
        }
    });

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Meter Data");

    // Generate XLSX file and trigger download
    XLSX.writeFile(wb, 'meter_data.xlsx');
});

function parseDateTime(dateTimeString) {
    const parts = dateTimeString.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    const ampm = parts[2];

    let hours = parseInt(timeParts[0]);
    if (ampm === 'PM' && hours < 12) {
        hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
    }

    return new Date(dateParts[2], dateParts[1] - 1, dateParts[0], hours, timeParts[1]);
}

function parseCSV(text) {
    const rows = text.split('\n').map(row => row.split(','));
    const formattedData = rows.map(row => {
        if (row[0]) {
            // Split date and time
            const dateTimeParts = row[0].split(' ');
            const dateParts = dateTimeParts[0].split('/');
            const timeParts = dateTimeParts[1].split(':');

            // Create a new Date object
            const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1]);
            
            // Check for invalid date
            if (isNaN(date.getTime())) {
                row[0] = 'Invalid Date'; // Set to 'Invalid Date' if parsing fails
            } else {
                row[0] = date.toString(); // Convert to string for display
            }
        }
        return row;
    });
    return formattedData;
}

function displayData(dataArrays, output) {
    // Prepare to store the filtered data for each meter
    const maxRows = Math.max(dataArrays[0].length, dataArrays[1].length, dataArrays[2].length, dataArrays[3].length);
    const filteredData = [];

    // Loop through each row index up to the max number of rows
    for (let i = 0; i < maxRows; i++) {
        const row = [];
        // For each meter, get the relevant data or leave blank if it doesn't exist
        for (let j = 0; j < dataArrays.length; j++) {
            if (dataArrays[j][i]) {
                if (j === 0) {
                    // For Meter 1, keep the Date and the relevant columns
                    row.push(dataArrays[j][i][0] || ''); // Date
                    row.push(dataArrays[j][i][20] || ''); // Column 32
                    row.push(dataArrays[j][i][23] || ''); // Column 34
                } else {
                    // For Meter 2, Meter 3, and Meter 4, only keep the relevant columns
                    row.push('', dataArrays[j][i][20] || '', dataArrays[j][i][23] || ''); // Empty for Date, keep columns 32 and 34
                }
            } else {
                row.push('', '', ''); // Fill with empty strings if no data
            }
        }
        filteredData.push(row);
    }

    // Display the data in a column format
    output.innerHTML += '<strong>Meter 1 (Date) | Meter 2 | Meter 3 | Meter 4</strong><br>';
    filteredData.forEach(row => {
        output.innerHTML += row.join(' | ') + '<br>'; // Display data in a readable format
    });
}