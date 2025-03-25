const { ipcRenderer } = require('electron');
let csvData = []; // Store the parsed CSV data
let headers = [];

ipcRenderer.on('virtualize-log', (event, message) => {
  console.log('Live Log:', message);
  // You can also append this to a UI element if needed
});

// Handle file parsing and CSV data rendering
ipcRenderer.on('file-parsed', (event, { data, headers: fileHeaders }) => {
  csvData = data;
  headers = fileHeaders;

  // Populate the table preview
  const table = document.getElementById('csv-table');
  table.innerHTML = `
    <thead>
      <tr>${headers.map(header => `<th class="clickable">${header}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.slice(0, 5).map(row => `
        <tr>${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  `;

  // Add click event listeners to the headers
  headers.forEach((header, index) => {
    const th = table.querySelector(`th:nth-child(${index + 1})`);
    th.addEventListener('click', () => openSQLModal(header));
  });
});

// Open the SQL modal for the selected column
function openSQLModal(column) {
  const sizeInfo = ipcRenderer.sendSync('get-column-size', column); // Get column size
  const modal = document.getElementById('sql-modal');

  // Populate modal with column information and SQL query
  const queryBox = modal.querySelector('#query-box');
  queryBox.textContent = `SELECT "${column}" FROM table LIMIT 10;`;

  const sizeDisplay = modal.querySelector('#column-size');
  sizeDisplay.textContent = `Size: ${sizeInfo}`;

  // Show the modal
  modal.style.display = 'block';
}

// Close the SQL modal
document.getElementById('close-modal').addEventListener('click', () => {
  const modal = document.getElementById('sql-modal');
  modal.style.display = 'none';
});

// Run the SQL query via DuckDB
document.getElementById('run-query').addEventListener('click', () => {
  const query = document.getElementById('query-box').textContent;

  ipcRenderer.send('run-query', query);
});

// Listen for query results and display them
ipcRenderer.on('query-result', (event, result) => {
  const modal = document.getElementById('sql-modal');
  const resultBox = modal.querySelector('#query-results');

  if (result.error) {
    resultBox.textContent = `Error: ${result.error}`;
  } else {
    // Render query results as a table
    const rows = result.rows;
    if (rows.length === 0) {
      resultBox.textContent = 'No results found.';
    } else {
      const keys = Object.keys(rows[0]);
      resultBox.innerHTML = `
        <table>
          <thead>
            <tr>${keys.map(key => `<th>${key}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>${keys.map(key => `<td>${row[key]}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  }
});