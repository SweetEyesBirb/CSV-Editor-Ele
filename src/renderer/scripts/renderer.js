const { ipcRenderer } = require('electron');
const fs = require('fs');

let currentFilePath = null;
let allowNonEnglish = false; // Default state

// ipcRenderer 
// webContents.send() is used to send a message from the menu to the DOM. In the DOM, we can get
// these messages with ipcRenderer
ipcRenderer.on('toggle-non-english', (event, state) => {
  allowNonEnglish = state;
  console.log(state)
  showToast(`Non-English characters ${state ? "enabled" : "disabled"}`);
});


ipcRenderer.on('load-csv', (event, filePaths) => {
  console.log('Received load-csv in renderer:', filePaths);
  const filePath = filePaths[0]; // only use the first file
  if (filePath) {
    loadFile(filePath);
  }
  currentFilePath = filePath;
});


ipcRenderer.on('set-theme', (event, themeName) => {
  setTheme(themeName);
});


ipcRenderer.on('save-file', () => {
  const fs = require('fs');

  if (!allowNonEnglish && hasNonEnglishCharacters()) {
    showToast("Cannot save: non-English characters detected.", 4000);
    console.warn("Save prevented due to non-English characters.");
    return;
  }

  const data = generateCSV();

  if (!data || typeof data !== 'string') {
    console.error("CSV data is invalid or empty.");
    return;
  }

  try {
    fs.writeFileSync(currentFilePath, data, 'utf8');
    console.log(`File saved successfully at ${currentFilePath}`);
    showToast("File saved successfully!");
  } catch (err) {
    console.error("Error saving file:", err);
  }

});


ipcRenderer.on('save-as', (event, filePath) => {
  const fs = require('fs');

  if (!allowNonEnglish && hasNonEnglishCharacters()) {
    showToast("Cannot save: non-English characters detected.", 4000);
    console.warn("Save prevented due to non-English characters.");
    return;
  }

  const data = generateCSV() // use the function above but return a string

  try {
    fs.writeFileSync(filePath, data, 'utf8');
    console.log(`File saved successfully at ${filePath}`)
    showToast("File saved successfully!");

  } catch (err) {
    console.error("Error saving file:", err);
  }

  currentFilePath = filePath;
});


// Load file Function
async function loadFile(filePath) {
  console.log('Loading file:', filePath);
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    const rows = text.trim().split('\n').map(row =>
      row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/) // CSV-safe split
    );

    const table = document.createElement('table');

    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.classList.add('row');
      tr.setAttribute('tb-row', i)

      // row.forEach((cell, j) => {
      for (let j = -1; j < row.length; j++) {
        const td = document.createElement('td');

        td.addEventListener('input', () => {
          validateCellContent(td);
        });

        // Corner cell
        if (i === 0 && j === -1) {
          td.classList.add('corner-cell');
          td.textContent = ''; // can stay blank
        }

        // Header row
        else if (i === 0) {
          td.classList.add('header-cell');
          td.contentEditable = true;
          td.textContent = row[j] //cell;
        }

        // Index column
        else if (j === -1) {
          td.classList.add('index-cell');
          td.textContent = i;
          td.contentEditable = false
        }

        // Normal data cells
        else {
          td.contentEditable = true;
          td.textContent = row[j] // cell;
        }

        // Add identifiers for later targeting
        td.dataset.row = i;
        td.dataset.col = j;

        tr.appendChild(td);
      };

      // If the row is shorter than the max columns, fill it out
      while (tr.children.length < rows[0].length) {
        const filler = document.createElement('td');
        filler.contentEditable = true;
        tr.appendChild(filler);
      }

      table.appendChild(tr);
    });

    const container = document.getElementById('tableContainer');
    container.innerHTML = '';
    container.appendChild(table);
  } catch (err) {
    console.error('Error reading file:', err);
  }
}


// Called when app loads to create an empty grid
function createEmptyGrid(rows = 100, cols = 20) {
  const table = document.createElement('table');

  for (let i = 0; i <= rows; i++) {
    const tr = document.createElement('tr');
    tr.classList.add('row');
    tr.setAttribute('tb-row', i)

    for (let j = -1; j < cols; j++) {
      const td = document.createElement('td');

      td.addEventListener('input', () => {
        validateCellContent(td);
      });

      // Top-left corner cell
      if (i === 0 && j === -1) {
        td.textContent = '';
        td.classList.add('corner-cell'); // optional styling
        td.contentEditable = false;
      }
      // Header row (first row)
      else if (i === 0) {
        td.textContent = `Header ${j + 1}`;
        td.classList.add('header-cell');
        td.contentEditable = true; // editable if you want to allow column renaming
      }
      // Index column (first column)
      else if (j === -1) {
        td.textContent = i; // row number
        td.classList.add('index-cell');
        td.contentEditable = false;
      }
      // Regular editable cell
      else {
        td.textContent = '';
        td.contentEditable = true;
      }

      // Add identifiers for later targeting
      td.dataset.row = i;
      td.dataset.col = j;

      tr.appendChild(td);
    }

    table.appendChild(tr);
  }

  const container = document.getElementById('tableContainer');
  container.innerHTML = '';
  container.appendChild(table);
}

// Things to do when the page loads
window.addEventListener('DOMContentLoaded', () => {
  createEmptyGrid();
  // Theme
  const savedTheme = localStorage.getItem('theme') || 'dark'; // default to dark
  setTheme(savedTheme);
});


// Get table data
function getTableDataAsCSV() {
  const rows = [];
  const trs = document.querySelectorAll('table tr');

  trs.forEach((tr, i) => {
    const cells = Array.from(tr.querySelectorAll('td'));

    // Skip the first cell (index or corner)
    const dataCells = cells.slice(1).map(cell => `"${cell.textContent.trim()}"`);
    rows.push(dataCells.join(','));
  });

  return rows.join('\n');
}


// Theme
function setTheme(themeName) {
  const themeLink = document.getElementById('themeStylesheet');
  themeLink.href = `./styles/themes/theme-${themeName}.css`;

  localStorage.setItem('theme', themeName);
}


// Context menu
const contextMenuHeader = document.getElementById('contextMenu-h');
const contextMenuIndex = document.getElementById('contextMenu-i')
let selectedColNumber = null;
let selectedRowNumber = null;

// contextmenu is a special browser event that fires only when you right-click
//  listens for any right-click event on the whole page.
document.addEventListener('contextmenu', (e) => {
  if (e.target.classList.contains('header-cell')) {
    // e.preventDefault(); // This prevents the default browser menu

    selectedColNumber = parseInt(e.target.getAttribute('data-col'), 10);

    contextMenuHeader.style.top = `${e.pageY}px`; // Position at mouse Y
    contextMenuHeader.style.left = `${e.pageX}px`; // Position at mouse X
    contextMenuHeader.style.display = 'block'; // Show the menu
  } else {
    contextMenuHeader.style.display = 'none';
  }
});




document.addEventListener('contextmenu', (e) => {
  if (e.target.classList.contains('index-cell')) {
    e.preventDefault(); // This prevents the default browser menu

    selectedRowNumber = parseInt(e.target.getAttribute('data-row'), 10);

    contextMenuIndex.style.top = `${e.pageY}px`; // Position at mouse Y
    contextMenuIndex.style.left = `${e.pageX}px`; // Position at mouse X
    contextMenuIndex.style.display = 'block'; // Show the menu
  } else {
    contextMenuIndex.style.display = 'none';
  }
});

document.addEventListener('click', () => {
  contextMenuHeader.style.display = 'none';
  contextMenuIndex.style.display = 'none';
});

document.getElementById('insert-col-left').addEventListener('click', () => {
  console.log('Insert column left of', selectedColNumber);
  insertColAt(selectedColNumber, 'left'); // re-indexing happens in insertColAt
});



document.getElementById('insert-col-right').addEventListener('click', () => {
  console.log('Insert column right of', selectedColNumber);
  insertColAt(selectedColNumber, 'right'); // re-indexing happens in insertColAt
});

// Delete column logic
document.getElementById('delete-col').addEventListener('click', () => {
  console.log('Delete Column', selectedColNumber);

  const cellsToDelete = getCellsInCol(selectedColNumber);
  cellsToDelete.forEach(cell => cell.remove());

  reindexColAttributes(); // Maintain clean indexing
  // reindexTable()
});

// Empty Column
document.getElementById('empty-col').addEventListener('click', () => {
  console.log('Empty Column', selectedColNumber)
  const cellsToEmpty = getCellsInCol(selectedColNumber)

  cellsToEmpty.forEach(cell => {
    if (!cell.classList.contains('header-cell')) {
      cell.innerHTML = ''
    }
  });
})


// Insert Row above function
document.getElementById('insert-row-above').addEventListener('click', () => {
  console.log('Insert row above of', selectedRowNumber);

  const allRows = document.querySelectorAll('#tableContainer > table > .row');
  let targetRow = null;

  allRows.forEach(row => {
    if (row.getAttribute('tb-row') == selectedRowNumber) {
      targetRow = row;
    }
  });

  if (!targetRow) return;

  const colCount = targetRow.querySelectorAll('td').length;
  const newRow = createEmptyRow(Number(selectedRowNumber), colCount);

  targetRow.parentNode.insertBefore(newRow, targetRow);
  reindexTable();
});


// Insert Row Below function
document.getElementById('insert-row-below').addEventListener('click', () => {
  console.log('Insert row below of', selectedRowNumber);

  const allRows = document.querySelectorAll('#tableContainer > table > .row');
  let targetRow = null;

  allRows.forEach(row => {
    if (row.getAttribute('tb-row') == selectedRowNumber) {
      targetRow = row;
    }
  });

  if (!targetRow) return;

  const colCount = targetRow.querySelectorAll('td').length;
  const newRow = createEmptyRow(Number(selectedRowNumber) + 1, colCount);

  targetRow.parentNode.insertBefore(newRow, targetRow.nextSibling);
  reindexTable();
});

// Delete row logic
document.getElementById('delete-row').addEventListener('click', () => {
  console.log('Delete row', selectedRowNumber);
  let rowElement = document.querySelectorAll('#tableContainer > table > .row')

  rowElement.forEach(row => {
    let tbRow = row.getAttribute('tb-row');

    if (tbRow == selectedRowNumber) {
      row.remove();
      console.log('Removed row', row)
    }
  })

  reindexTable();

});


// Empty Row Function
document.getElementById('empty-row').addEventListener('click', () => {
  console.log('Empty Row', selectedRowNumber);
  const row = getRowByNumber(selectedRowNumber);
  if (!row) return;

  const cells = row.querySelectorAll('td:not(.index-cell)');
  cells.forEach(cell => cell.textContent = '');
});



// Helper Functions

function createEmptyRow(rowIndex, colCount) {
  const newRow = document.createElement('tr');
  newRow.classList.add('row');

  for (let j = 0; j < colCount; j++) {
    const td = document.createElement('td');
    if (j === 0) {
      td.classList.add('index-cell');
      td.contentEditable = false;
      td.textContent = '?'; // Will be fixed in reindexing
    } else {
      td.contentEditable = true;
      td.textContent = '';
      td.dataset.row = rowIndex;
      td.dataset.col = j - 1;
    }
    newRow.appendChild(td);
  }

  return newRow;
}



function reindexTable() {
  const updatedRows = document.querySelectorAll('#tableContainer > table > .row');

  updatedRows.forEach((row, i) => {
    row.setAttribute('tb-row', i);

    const cells = row.querySelectorAll('td');
    cells.forEach((cell, j) => {

      cell.addEventListener('input', () => {
        validateCellContent(cell);
      });

      if (i === 0 && j === 0) {
        cell.textContent = '';
      } else if (j === 0) {
        cell.classList.add('index-cell');
        cell.textContent = i;
        cell.dataset.row = i;
        cell.dataset.col = j - 1;
      } else {
        cell.dataset.row = i;
        cell.dataset.col = j - 1;
      }
    });
  });
}


function getRowByNumber(rowNumber) {
  return document.querySelector(`#tableContainer > table > .row[tb-row="${rowNumber}"]`);
}


function getCellsInCol(colNumber) {
  return Array.from(document.querySelectorAll(`#tableContainer td[data-col="${colNumber}"]`));
}


function reindexColAttributes() {
  const rows = document.querySelectorAll('#tableContainer > table > .row');

  rows.forEach(row => {
    let colIndex = -1;
    const cells = row.querySelectorAll('td');

    cells.forEach((cell, j) => {

      cell.addEventListener('input', () => {
        validateCellContent(cell);
      });

      if (!cell.classList.contains('index-cell') || !cell.classList.contains('corner-cell')) {
        cell.dataset.col = colIndex;
        colIndex++;
      }
    });
  });
}



function insertColAt(colNumber, position = 'right') {
  const rows = document.querySelectorAll('#tableContainer > table > .row');

  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('td');
    let refCell = null;

    cells.forEach(cell => {
      if (cell.dataset.col == colNumber) {
        refCell = cell;
      }
    });

    // Create new cell
    const newCell = document.createElement('td');

    if (rowIndex === 0) {
      newCell.classList.add('header-cell');
      newCell.contentEditable = true;
      newCell.textContent = '';
    } else if (cells[0].classList.contains('index-cell')) {
      newCell.contentEditable = true;
      newCell.textContent = '';
      newCell.dataset.row = row.getAttribute('tb-row');
    }

    // Insert cell before or after
    if (refCell) {
      if (position === 'left') {
        refCell.before(newCell);
      } else {
        refCell.after(newCell);
      }
    } else {
      // Fallback: just append to the end
      row.appendChild(newCell);
    }
  });

  reindexColAttributes();
}



function generateCSV(filename = "data.csv") {
  const rows = document.querySelectorAll('#tableContainer > table > .row');
  let csvData = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    const rowData = [];

    cells.forEach((cell) => {
      if (cell.classList.contains('index-cell') || cell.classList.contains('corner-cell')) return; // Skip index-cell except header
      let cellText = cell.textContent || "";

      // Convert to UTF-8
      const encoder = new TextEncoder(); // native UTF-8 encoder
      try {
        const bytes = encoder.encode(cellText);
        cellText = new TextDecoder('utf-8').decode(bytes);
      } catch {
        console.warn("Failed to encode cell to UTF-8:", cellText);
        cellText = ""; // fallback
      }

      // Escape double quotes and wrap in quotes if necessary
      if (cellText.includes(',') || cellText.includes('"')) {
        cellText = `"${cellText.replace(/"/g, '""')}"`;
      }

      rowData.push(cellText);
    });

    csvData.push(rowData);
  });

  // Trim trailing empty rows
  while (csvData.length > 0) {
    const last = csvData[csvData.length - 1];
    const nonEmpty = last.some(val => val.trim() !== "");
    if (!nonEmpty) {
      csvData.pop();
    } else {
      break;
    }
  }

  // Convert array of arrays to CSV string
  const csvContent = csvData.map(row => row.join(',')).join('\n');

  return csvContent
}



function showToast(message, duration = 3000) {
  const toast = document.getElementById('snackbar');
  toast.textContent = message;
  toast.className = "show"

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, duration);
}


function validateCellContent(cell, shToast = true) {
  const text = cell.textContent;

  // /[^\x00-\x7F]/  
  if (!allowNonEnglish && /[^\x00-\x7F]/.test(text)) {
    cell.classList.add('invalid-char');
    // Optional: replace text, warn user, etc.
    console.log(`${cell} contains non-english chars. Please use English characters`)
    if (shToast) {
      showToast("Please use English characters")
    }
    return false
  } else {
    cell.classList.remove('invalid-char');
    return true
  }
}


function hasNonEnglishCharacters() {
  const cells = document.querySelectorAll('#tableContainer td');

  if (!Array.from(cells).some(cell => { validateCellContent(cell, false) })) {
    return true
  } else {
    return false
  }

}