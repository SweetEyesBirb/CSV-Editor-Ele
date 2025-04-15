const { ipcRenderer } = require('electron');
const fs = require('fs');

// ipcRenderer 
// webContents.send() is used to send a message from the menu to the DOM. In the DOM, we can get
// these messages with ipcRenderer
ipcRenderer.on('FILE_OPEN', (event, filePaths) => {
  console.log('Received FILE_OPEN in renderer:', filePaths);
  const filePath = filePaths[0]; // only use the first file
  if (filePath) {
    loadFile(filePath);
  }
});


ipcRenderer.on('set-theme', (event, themeName) => {
  setTheme(themeName);
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
        for(let j = -1; j < row.length; j++) {
        const td = document.createElement('td');

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
      
      // Top-left corner cell
      if (i === 0 && j === -1) {
        td.textContent = '';
        td.classList.add('corner-cell'); // optional styling
        td.contentEditable = false;
      }
      // Header row (first row)
      else if (i === 0) {
        td.textContent = `Header ${j+1}`;
        td.classList.add('header-cell');
        td.contentEditable = true; // editable if you want to allow column renaming
      }
      // Index column (first column)
      else if (j === -1) {
        td.textContent = `${i}`; // row number
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



// function setTheme(themeName) {
//   const elements = document.querySelectorAll('[class*="theme-"]'); // Only elements with a class that includes "theme-"

//   elements.forEach(element => {
//     // Get current class list
//     const classes = element.className.split(' ');

//     // Replace any class that starts with "theme-" with the new one
//     const updatedClasses = classes.map(cls =>
//       cls.startsWith("theme-") ? `theme-${themeName}` : cls
//     );

//     // Apply the updated class string
//     element.className = updatedClasses.join(' ');
//   });

//   // Optional: store selected theme for later use
//   localStorage.setItem('theme', themeName);
// }


function setTheme(themeName) {
  const themeLink = document.getElementById('themeStylesheet');
  themeLink.href = `./styles/themes/theme-${themeName}.css`;

  localStorage.setItem('theme', themeName);
}