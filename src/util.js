function generateSql(column) {
  selectedColumn = column;
  const query = `SELECT ${column} FROM csv`; // SQL query for selected column
  showModal(query);
}

function showModal(query) {
  const modal = document.getElementById('sqlModal');
  const sqlQueryTextarea = document.getElementById('sqlQuery');
  sqlQueryTextarea.value = query;
  modal.style.display = 'block';
}

function closeModal() {
  const modal = document.getElementById('sqlModal');
  modal.style.display = 'none';
}

// Load the CSV into the table
async function loadCsv(filePath, header_array=null) {
  console.log('Loading the table..');
  try {
    console.log(filePath);

    const isParquet = filePath.endsWith('.parquet');
    let rows = [];

    if (isParquet) {
      rows = await window.electronAPI.readParquet(filePath);
    } else {
      console.log('started!!!!');
      rows = await window.electronAPI.readCsv(filePath);
      console.log('after????');
    }

    // Fetch the CSV data from the main process
    // let rows = await window.electronAPI.readCsv(filepath); // Assuming your Electron API provides this method
    
    console.log(rows);

    // Check if the CSV data is empty or invalid
    if (!rows || rows.length === 0) {
      throw new Error('No data found in CSV file');
    }

    // Limit the number of rows to 1,000
    rows = rows.slice(0, 1000);

    const table = document.getElementById('csvTable'); // Assuming there's a table with id 'csvTable'
    
    // Create table header from the first row of the CSV data
    var headerRow = Object.keys(rows[0]); // Use the keys of the first object as the header row

    if (header_array && Array.isArray(header_array)) {
      // Sort headerRow according to 'header' order, extras go to the end
      const headerSet = new Set(header_array);
      const sortedHeaderRow = [
        ...header_array.filter(h => headerRow.includes(h)),
        ...headerRow.filter(h => !headerSet.has(h))
      ];
      headerRow = sortedHeaderRow;
    }
    console.log('Header Row:', headerRow);
    
    // Clear any existing content in the table
    table.innerHTML = '';

    // Create table header
    const thead = table.createTHead();
    const header = thead.insertRow();
    
    headerRow.forEach(colName => {
      const th = document.createElement('th');
      th.textContent = colName;
      th.addEventListener('click', () => generateSql(colName)); // Add click event to generate SQL for column
      header.appendChild(th);
    });

    // Create table body
    const tbody = table.createTBody();
    rows.forEach((row, index) => {
      const tr = tbody.insertRow();
      headerRow.forEach(colName => {
        const td = tr.insertCell();
        td.textContent = row[colName]; // Access each cell value using the column name
      });

      // Add alternating row background color
      if (index % 2 === 0) {
        tr.style.backgroundColor = '#f9f9f9'; // Even rows
      } else {
        tr.style.backgroundColor = '#ffffff'; // Odd rows
      }
      
      // Add hover effect for rows
      tr.addEventListener('mouseover', () => {
        tr.style.backgroundColor = '#f1f1f1';
      });
      tr.addEventListener('mouseout', () => {
        tr.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
      });
    });
    return headerRow;
  } catch (err) {
    console.error('Error loading CSV:', err);
    alert('Failed to load CSV. Please check the file path.');
  }
}

function generateSizes(sizes) {
  // Data for the chart
  // const sizes = { virtual: 5000000, parquet: 12000000 }; // Example data
  const labels = Object.keys(sizes); // ["virtual", "parquet"]
  const data = Object.values(sizes).map(size => size / 1000000); // Convert to MB

  let colors = []
  if (data.length === 2) {
    colors = ['#b97f45', '#1f80df']; // Colors for the bars
  } else if (data.length === 3) {
    colors = ['#95393a', '#b97f45', '#1f80df']; // Colors for the bars
  } else {
    assert(0);
  }

  // Create the bar chart
  const ctx = document.getElementById('barChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors, // Bar colors
        // borderColor: colors, // Border colors
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: {
          display: false, // Enable legend
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              // Format the tooltip to show the value in MB
              return tooltipItem.raw.toFixed(2) + ' MB';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Size (MB)',
            font: {
              size: 14 // Y-axis title font size
            }
          },
          ticks: {
            font: {
              size: 12 // Y-axis tick font size
            }
          }
        }
      }
    }
  });
}