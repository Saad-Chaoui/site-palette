// DOM Elements
const extractBtn = document.getElementById('extract-btn');
const paletteContainer = document.getElementById('palette-container');
const colorFormat = document.getElementById('color-format');
const saveButton = document.getElementById('save-palette');
const exportButton = document.getElementById('export-palette');
const loaderContainer = document.querySelector('.loader-container');
const noColorsMessage = document.getElementById('no-colors-message');
const statusMessage = document.getElementById('status-message');
const savedPalettesSection = document.getElementById('saved-palettes-section');
const savedPalettesContainer = document.getElementById('saved-palettes-container');
const colorRelationshipsSection = document.getElementById('color-relationships');
const relationshipsContainer = document.getElementById('relationships-container');
const exportModal = document.getElementById('export-modal');
const closeModal = document.querySelector('.close-modal');
const exportOutput = document.getElementById('export-output');
const copyExport = document.getElementById('copy-export');
const exportOptions = document.querySelectorAll('.export-options button');

// Global variables
let currentPalette = [];
let activeTab = null;

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  // Show a brief loading animation
  showLoadingState(true);
  
  // Get the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    activeTab = tabs[0];
    
    // Check if there's already extracted data for this tab
    chrome.storage.local.get([`palette_${activeTab.id}`], (result) => {
      const storedPalette = result[`palette_${activeTab.id}`];
      if (storedPalette && storedPalette.length) {
        currentPalette = storedPalette;
        displayPalette(currentPalette);
        displayColorRelationships(currentPalette);
        
        // Automatically fade in the components with animation
        setTimeout(() => {
          paletteContainer.style.opacity = "1";
          colorRelationshipsSection.style.opacity = "1";
        }, 300);
      } else {
        showEmptyState();
      }
      
      showLoadingState(false);
    });
    
    // Load saved palettes
    loadSavedPalettes();
  });
  
  // Initialize event listeners
  initEventListeners();
  
  // Check for saved color format preference
  chrome.storage.local.get(['colorFormatPreference'], (result) => {
    if (result.colorFormatPreference) {
      colorFormat.value = result.colorFormatPreference;
    }
  });
});

// Show loading state
function showLoadingState(isLoading) {
  if (isLoading) {
    loaderContainer.style.display = 'flex';
    paletteContainer.style.display = 'none';
  } else {
    loaderContainer.style.display = 'none';
    paletteContainer.style.display = 'grid';
  }
}

// Show empty state message
function showEmptyState() {
  paletteContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🎨</div>
      <h3>Extract Site Colors</h3>
      <p>Click the extract button to analyze the color palette of this website.</p>
    </div>
  `;
}

// Initialize all event listeners
function initEventListeners() {
  // Extract button click
  extractBtn.addEventListener('click', extractColors);
  
  // Color format change
  colorFormat.addEventListener('change', (e) => {
    updateColorFormat();
    
    // Save format preference
    chrome.storage.local.set({
      colorFormatPreference: e.target.value
    });
  });
  
  // Save palette button click
  saveButton.addEventListener('click', savePalette);
  
  // Export palette button click
  exportButton.addEventListener('click', showExportModal);
  
  // Close modal button click
  closeModal.addEventListener('click', hideExportModal);
  
  // Export format selection
  exportOptions.forEach(button => {
    button.addEventListener('click', selectExportFormat);
  });
  
  // Copy export button click
  copyExport.addEventListener('click', copyExportText);
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      hideExportModal();
    }
  });
  
  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !exportModal.classList.contains('hidden')) {
      hideExportModal();
    }
  });
}

// Extract colors from the active tab
function extractColors() {
  // Show loader
  loaderContainer.style.display = 'flex';
  paletteContainer.innerHTML = '';
  paletteContainer.style.opacity = "0";
  noColorsMessage.classList.add('hidden');
  colorRelationshipsSection.classList.add('hidden');
  statusMessage.textContent = 'Extracting colors...';
  
  // Show an animated loading state
  extractBtn.disabled = true;
  extractBtn.textContent = 'Extracting...';
  
  // Send message to content script to extract colors
  chrome.tabs.sendMessage(activeTab.id, { action: 'extractColors' }, (response) => {
    loaderContainer.style.display = 'none';
    extractBtn.disabled = false;
    extractBtn.textContent = 'Extract Colors';
    
    if (chrome.runtime.lastError) {
      // If content script is not loaded yet, inject it
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }, () => {
        // Retry after content script is injected
        setTimeout(() => extractColors(), 200);
      });
      return;
    }
    
    if (response && response.colors && response.colors.length > 0) {
      currentPalette = processPalette(response.colors);
      
      // Save to local storage for the tab
      chrome.storage.local.set({
        [`palette_${activeTab.id}`]: currentPalette
      });
      
      displayPalette(currentPalette);
      displayColorRelationships(currentPalette);
      
      // Fade in the components with animation
      setTimeout(() => {
        paletteContainer.style.opacity = "1";
        colorRelationshipsSection.style.opacity = "1";
      }, 100);
    } else {
      noColorsMessage.classList.remove('hidden');
    }
  });
}

// Process the extracted colors to create a palette
function processPalette(colors) {
  // Count color occurrences
  const colorCount = {};
  
  colors.forEach(color => {
    const hex = color.toLowerCase();
    colorCount[hex] = (colorCount[hex] || 0) + 1;
  });
  
  // Convert to array of [color, count] pairs and sort by count
  const sortedColors = Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);
  
  // Limit to the most significant colors (max 12)
  return sortedColors.slice(0, 12);
}

// Display the extracted palette
function displayPalette(palette) {
  paletteContainer.innerHTML = '';
  
  if (palette.length === 0) {
    noColorsMessage.classList.remove('hidden');
    return;
  }
  
  const template = document.getElementById('color-item-template');
  
  palette.forEach((color, index) => {
    const colorItem = template.content.cloneNode(true);
    const colorItemElement = colorItem.querySelector('.color-item');
    const swatch = colorItem.querySelector('.color-swatch');
    const colorCode = colorItem.querySelector('.color-code');
    const copyBtn = colorItem.querySelector('.copy-btn');
    
    // Set the color swatch background
    swatch.style.backgroundColor = color;
    
    // Set the color-swatch-bg custom property for the highlight line
    colorItemElement.style.setProperty('--color-swatch-bg', color);
    
    // Set delay for staggered animation
    colorItemElement.style.animationDelay = `${index * 0.05}s`;
    
    // Add the fade-in class for animation
    colorItemElement.classList.add('fade-in');
    
    // Set the color code text based on selected format
    colorCode.textContent = formatColor(color, colorFormat.value);
    
    // Set copy button action
    copyBtn.addEventListener('click', () => {
      copyColorToClipboard(color, colorFormat.value, copyBtn);
    });
    
    // Double click on swatch to copy
    swatch.addEventListener('dblclick', () => {
      copyColorToClipboard(color, colorFormat.value, copyBtn);
    });
    
    paletteContainer.appendChild(colorItem);
  });
}

// Format color based on selected format
function formatColor(color, format) {
  // Convert to RGB color object
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  switch (format) {
    case 'hex':
      return color.toUpperCase();
    case 'rgb':
      return `rgb(${r}, ${g}, ${b})`;
    case 'hsl':
      const [h, s, l] = rgbToHsl(r, g, b);
      return `hsl(${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%)`;
    default:
      return color.toUpperCase();
  }
}

// Convert RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h *= 60;
  }
  
  return [h, s * 100, l * 100];
}

// Update the color format when the dropdown changes
function updateColorFormat() {
  const format = colorFormat.value;
  const colorCodes = document.querySelectorAll('.color-code');
  
  colorCodes.forEach((codeElement, index) => {
    const color = currentPalette[index];
    codeElement.textContent = formatColor(color, format);
  });
}

// Copy color code to clipboard
function copyColorToClipboard(color, format, button) {
  const formattedColor = formatColor(color, format);
  
  navigator.clipboard.writeText(formattedColor).then(() => {
    // Show copied feedback
    button.textContent = 'Copied!';
    button.classList.add('copied');
    
    // Show a toast notification
    showToast(`Copied: ${formattedColor}`);
    
    setTimeout(() => {
      button.textContent = 'Copy';
      button.classList.remove('copied');
    }, 1500);
  });
}

// Show toast notification
function showToast(message) {
  // Create toast element if it doesn't exist
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  
  // Set message and show toast
  toast.textContent = message;
  toast.classList.add('show');
  
  // Hide toast after 2 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// Save the current palette
function savePalette() {
  if (currentPalette.length === 0) return;
  
  const siteName = activeTab.title || 'Unnamed Site';
  const hostname = new URL(activeTab.url).hostname;
  const timestamp = new Date().getTime();
  
  const paletteData = {
    id: `palette_${timestamp}`,
    siteName,
    hostname,
    date: new Date().toLocaleDateString(),
    colors: currentPalette
  };
  
  // Get existing saved palettes
  chrome.storage.local.get(['savedPalettes'], (result) => {
    const savedPalettes = result.savedPalettes || [];
    savedPalettes.unshift(paletteData);
    
    // Save to storage
    chrome.storage.local.set({ savedPalettes }, () => {
      // Show the saved palettes section and update the display
      loadSavedPalettes();
      
      // Show feedback
      saveButton.textContent = 'Saved!';
      showToast('Palette saved successfully!');
      
      setTimeout(() => {
        saveButton.textContent = 'Save Palette';
      }, 1500);
    });
  });
}

// Load saved palettes from storage
function loadSavedPalettes() {
  chrome.storage.local.get(['savedPalettes'], (result) => {
    const savedPalettes = result.savedPalettes || [];
    
    if (savedPalettes.length > 0) {
      savedPalettesSection.classList.remove('hidden');
      displaySavedPalettes(savedPalettes);
    } else {
      savedPalettesSection.classList.add('hidden');
    }
  });
}

// Display saved palettes
function displaySavedPalettes(palettes) {
  savedPalettesContainer.innerHTML = '';
  
  palettes.forEach(palette => {
    const paletteEl = document.createElement('div');
    paletteEl.className = 'saved-palette';
    paletteEl.dataset.id = palette.id;
    
    // Create palette colors display
    const colorsEl = document.createElement('div');
    colorsEl.className = 'saved-palette-colors';
    
    palette.colors.slice(0, 5).forEach(color => {
      const colorEl = document.createElement('div');
      colorEl.className = 'saved-color';
      colorEl.style.backgroundColor = color;
      
      // Add tooltip showing the color code
      colorEl.title = color.toUpperCase();
      
      colorsEl.appendChild(colorEl);
    });
    
    // Create palette info
    const infoEl = document.createElement('div');
    infoEl.className = 'saved-palette-info';
    infoEl.innerHTML = `
      <div>${palette.siteName}</div>
      <div class="saved-date">${palette.date}</div>
    `;
    
    // Create palette actions
    const actionsEl = document.createElement('div');
    actionsEl.className = 'saved-palette-actions';
    
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => loadPalette(palette));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deletePalette(palette.id));
    
    actionsEl.appendChild(loadBtn);
    actionsEl.appendChild(deleteBtn);
    
    // Append all elements
    paletteEl.appendChild(colorsEl);
    paletteEl.appendChild(infoEl);
    paletteEl.appendChild(actionsEl);
    
    savedPalettesContainer.appendChild(paletteEl);
  });
}

// Load a saved palette
function loadPalette(palette) {
  currentPalette = palette.colors;
  displayPalette(currentPalette);
  displayColorRelationships(currentPalette);
  
  // Show success message
  showToast('Palette loaded!');
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete a saved palette
function deletePalette(id) {
  chrome.storage.local.get(['savedPalettes'], (result) => {
    const savedPalettes = result.savedPalettes || [];
    const updatedPalettes = savedPalettes.filter(p => p.id !== id);
    
    chrome.storage.local.set({ savedPalettes: updatedPalettes }, () => {
      loadSavedPalettes();
      
      // Show feedback
      showToast('Palette deleted');
    });
  });
}

// Display color relationships
function displayColorRelationships(palette) {
  if (palette.length < 2) return;
  
  relationshipsContainer.innerHTML = '';
  colorRelationshipsSection.classList.remove('hidden');
  colorRelationshipsSection.style.opacity = "0";
  
  // Find complementary colors
  if (palette.length >= 2) {
    addRelationshipGroup('Complementary', [
      palette[0],
      findComplementaryColor(palette[0])
    ]);
  }
  
  // Find analogous colors
  if (palette.length >= 3) {
    addRelationshipGroup('Analogous', getAnalogousColors(palette[0]));
  }
  
  // Find triadic colors
  if (palette.length >= 3) {
    addRelationshipGroup('Triadic', getTriadicColors(palette[0]));
  }
  
  // Add monochromatic colors based on the primary color
  addRelationshipGroup('Monochromatic', getMonochromaticColors(palette[0]));
  
  // Fade in with animation
  setTimeout(() => {
    colorRelationshipsSection.style.opacity = "1";
  }, 300);
}

// Get monochromatic colors (variations of the same hue)
function getMonochromaticColors(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Convert to HSL
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Create variations with different lightness
  return [
    hslToHex(h, s, Math.max(l - 30, 10)),
    hslToHex(h, s, Math.max(l - 15, 20)),
    hexColor,
    hslToHex(h, s, Math.min(l + 15, 80)),
    hslToHex(h, s, Math.min(l + 30, 90))
  ];
}

// Add a relationship group to the display
function addRelationshipGroup(title, colors) {
  const groupEl = document.createElement('div');
  groupEl.className = 'relationship-group';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'relationship-title';
  titleEl.textContent = title;
  
  const colorsEl = document.createElement('div');
  colorsEl.className = 'relationship-colors';
  
  colors.forEach(color => {
    const colorEl = document.createElement('div');
    colorEl.className = 'relationship-color';
    colorEl.style.backgroundColor = color;
    
    // Add tooltip showing the color code
    colorEl.title = color.toUpperCase();
    
    // Add click-to-copy functionality
    colorEl.addEventListener('click', () => {
      navigator.clipboard.writeText(color.toUpperCase()).then(() => {
        showToast(`Copied: ${color.toUpperCase()}`);
      });
    });
    
    colorsEl.appendChild(colorEl);
  });
  
  groupEl.appendChild(titleEl);
  groupEl.appendChild(colorsEl);
  relationshipsContainer.appendChild(groupEl);
}

// Find the complementary color
function findComplementaryColor(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Find complementary RGB values
  const rComp = 255 - r;
  const gComp = 255 - g;
  const bComp = 255 - b;
  
  // Convert back to hex
  return `#${rComp.toString(16).padStart(2, '0')}${gComp.toString(16).padStart(2, '0')}${bComp.toString(16).padStart(2, '0')}`;
}

// Get analogous colors
function getAnalogousColors(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Convert to HSL
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Get analogous colors (original, +30 degrees, -30 degrees)
  return [
    hexColor,
    hslToHex((h + 30) % 360, s, l),
    hslToHex((h - 30 + 360) % 360, s, l)
  ];
}

// Get triadic colors
function getTriadicColors(hexColor) {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Convert to HSL
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Get triadic colors (original, +120 degrees, +240 degrees)
  return [
    hexColor,
    hslToHex((h + 120) % 360, s, l),
    hslToHex((h + 240) % 360, s, l)
  ];
}

// Convert HSL to hex
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r, g, b;
  
  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }
  
  r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
}

// Show export modal
function showExportModal() {
  if (currentPalette.length === 0) return;
  
  exportModal.classList.remove('hidden');
  
  // Select the first format by default
  exportOptions[0].click();
}

// Hide export modal
function hideExportModal() {
  exportModal.classList.add('hidden');
}

// Select export format
function selectExportFormat(e) {
  // Remove active class from all buttons
  exportOptions.forEach(btn => btn.classList.remove('active'));
  
  // Add active class to clicked button
  e.target.classList.add('active');
  
  // Generate export text based on format
  const format = e.target.dataset.format;
  const exportText = generateExportText(format);
  
  exportOutput.value = exportText;
}

// Generate export text
function generateExportText(format) {
  if (currentPalette.length === 0) return '';
  
  switch (format) {
    case 'json':
      const jsonData = {
        palette: currentPalette.map(color => ({
          hex: color.toUpperCase(),
          rgb: formatColor(color, 'rgb'),
          hsl: formatColor(color, 'hsl')
        }))
      };
      return JSON.stringify(jsonData, null, 2);
      
    case 'css':
      return `:root {\n${currentPalette.map((color, index) => 
        `  --color-${index + 1}: ${color.toUpperCase()};`).join('\n')}\n}`;
      
    case 'scss':
      return currentPalette.map((color, index) => 
        `$color-${index + 1}: ${color.toUpperCase()};`).join('\n');
      
    default:
      return currentPalette.map(color => color.toUpperCase()).join('\n');
  }
}

// Copy export text to clipboard
function copyExportText() {
  navigator.clipboard.writeText(exportOutput.value).then(() => {
    copyExport.textContent = 'Copied!';
    showToast('Copied to clipboard!');
    
    setTimeout(() => {
      copyExport.textContent = 'Copy to Clipboard';
    }, 1500);
  });
} 