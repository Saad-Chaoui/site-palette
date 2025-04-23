// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractColors') {
    const colors = extractColorsFromPage();
    sendResponse({ colors });
  }
  return true; // Required for async sendResponse
});

// Extract colors from the current webpage
function extractColorsFromPage() {
  // Get all elements in the page
  const allElements = document.querySelectorAll('*');
  const colorSet = new Set();
  
  // Process each element to extract colors
  allElements.forEach(element => {
    // Get computed styles for the element
    const styles = window.getComputedStyle(element);
    
    // Extract various color properties
    extractColorFromStyle(styles.color, colorSet);
    extractColorFromStyle(styles.backgroundColor, colorSet);
    extractColorFromStyle(styles.borderColor, colorSet);
    extractColorFromStyle(styles.boxShadow, colorSet);
    extractColorFromStyle(styles.textShadow, colorSet);
    extractColorFromStyle(styles.fill, colorSet);
    extractColorFromStyle(styles.stroke, colorSet);
    
    // Check for gradient backgrounds
    extractGradientColors(styles.backgroundImage, colorSet);
  });
  
  // Process images on the page to extract dominant colors
  // Note: This is done asynchronously, but we return the colors we have immediately
  // for faster response. Image colors will be added in future extractions.
  processImagesForDominantColors();
  
  // Convert Set to Array and filter/clean the colors
  return Array.from(colorSet)
    .filter(color => isValidColor(color));
}

// Extract a color from a style value
function extractColorFromStyle(styleValue, colorSet) {
  if (!styleValue || styleValue === 'none' || styleValue === 'transparent' || styleValue === 'rgba(0, 0, 0, 0)') {
    return;
  }
  
  try {
    // Handle RGB/RGBA colors
    if (styleValue.startsWith('rgb')) {
      const rgbColor = convertRgbToHex(styleValue);
      if (rgbColor) {
        colorSet.add(rgbColor);
      }
    }
    // Handle named colors (convert to hex)
    else if (isNamedColor(styleValue)) {
      const hexColor = convertNamedColorToHex(styleValue);
      if (hexColor) {
        colorSet.add(hexColor);
      }
    }
    // Handle HSL colors
    else if (styleValue.startsWith('hsl')) {
      const hexColor = convertHslToHex(styleValue);
      if (hexColor) {
        colorSet.add(hexColor);
      }
    }
    // Handle Hex colors
    else if (styleValue.startsWith('#')) {
      // Normalize hex color (ensure it has 6 digits)
      const normalizedHex = normalizeHexColor(styleValue);
      if (normalizedHex) {
        colorSet.add(normalizedHex);
      }
    }
  } catch (error) {
    // Silently ignore any errors in color extraction
    console.debug('Error extracting color:', error);
  }
}

// Extract colors from gradients
function extractGradientColors(backgroundImage, colorSet) {
  if (!backgroundImage || backgroundImage === 'none') {
    return;
  }
  
  try {
    // Handle linear and radial gradients
    if (backgroundImage.includes('gradient')) {
      // Extract color stops from the gradient
      const matches = backgroundImage.match(/(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-f]{3,8}|[a-z]+)/gi);
      
      if (matches) {
        matches.forEach(color => {
          // Skip position values and functions
          if (!color.match(/^(to|from|at|calc|var)/i) && !color.match(/^[0-9]/)) {
            if (color.startsWith('rgb')) {
              colorSet.add(convertRgbToHex(color));
            } else if (color.startsWith('hsl')) {
              colorSet.add(convertHslToHex(color));
            } else if (color.startsWith('#')) {
              colorSet.add(normalizeHexColor(color));
            } else if (isNamedColor(color)) {
              colorSet.add(convertNamedColorToHex(color));
            }
          }
        });
      }
    }
  } catch (error) {
    // Silently ignore any errors in gradient extraction
    console.debug('Error extracting gradient colors:', error);
  }
}

// Process images to extract dominant colors
function processImagesForDominantColors() {
  // Get all images that are reasonably sized
  const images = Array.from(document.querySelectorAll('img')).filter(img => {
    // Only process images that are loaded, visible, and not tiny
    return img.complete && img.naturalWidth > 20 && img.naturalHeight > 20 && isElementVisible(img);
  });
  
  // Limit to a reasonable number of images for performance
  const imagesToProcess = images.slice(0, 10);
  
  // Process each image
  imagesToProcess.forEach(img => {
    try {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      // Set canvas size to a small size for performance
      // (we don't need full resolution for color extraction)
      const size = 50;
      canvas.width = size;
      canvas.height = size;
      
      // Draw the image to the canvas
      ctx.drawImage(img, 0, 0, size, size);
      
      // Get image data from the canvas
      const imageData = ctx.getImageData(0, 0, size, size).data;
      
      // Process pixels to find dominant colors
      const colors = processImageData(imageData);
      
      // Store the colors (could use chrome.storage or message passing)
      // For now, we'll just log them for debugging
      console.debug('Image dominant colors:', colors);
      
      // We could send these back to the popup, but for simplicity
      // we'll let the next extraction pick them up
    } catch (error) {
      // Silently ignore any errors in image processing
      console.debug('Error processing image:', error);
    }
  });
}

// Process image data to find dominant colors
function processImageData(imageData) {
  // Use a simple color counting approach
  const colorCounts = {};
  const significantColors = [];
  
  // Sample pixels (skip some for performance)
  for (let i = 0; i < imageData.length; i += 16) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    // Quantize the colors a bit to reduce the number of unique colors
    const quantizedR = Math.round(r / 16) * 16;
    const quantizedG = Math.round(g / 16) * 16;
    const quantizedB = Math.round(b / 16) * 16;
    
    // Create a hex color
    const hexColor = rgbToHex(quantizedR, quantizedG, quantizedB);
    
    // Count occurrences
    colorCounts[hexColor] = (colorCounts[hexColor] || 0) + 1;
  }
  
  // Convert to array and sort by count
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);
  
  // Take the top colors
  return sortedColors.slice(0, 5);
}

// Helper function to check if an element is visible
function isElementVisible(element) {
  const styles = window.getComputedStyle(element);
  return styles.display !== 'none' && 
         styles.visibility !== 'hidden' && 
         styles.opacity !== '0' &&
         element.offsetWidth > 0 && 
         element.offsetHeight > 0;
}

// Convert RGB/RGBA color to hex
function convertRgbToHex(rgbColor) {
  // Extract r, g, b values from the rgb/rgba string
  const match = rgbColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(?:[\d.]+))?\)/i);
  
  if (match) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    
    return rgbToHex(r, g, b);
  }
  
  return null;
}

// Convert HSL/HSLA color to hex
function convertHslToHex(hslColor) {
  // Extract h, s, l values from the hsl/hsla string
  const match = hslColor.match(/hsla?\((\d+)(?:deg)?,\s*(\d+)%,\s*(\d+)%(?:,\s*(?:[\d.]+))?\)/i);
  
  if (match) {
    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    const l = parseInt(match[3]);
    
    // Convert HSL to RGB
    const rgb = hslToRgb(h, s, l);
    
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }
  
  return null;
}

// Convert HSL to RGB
function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}

// Convert RGB values to hex
function rgbToHex(r, g, b) {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Normalize hex colors (convert 3-digit hex to 6-digit)
function normalizeHexColor(hexColor) {
  // Remove hash if present
  hexColor = hexColor.replace('#', '');
  
  // Convert 3-digit hex to 6-digit
  if (hexColor.length === 3) {
    return `#${hexColor[0]}${hexColor[0]}${hexColor[1]}${hexColor[1]}${hexColor[2]}${hexColor[2]}`;
  }
  
  // Handle 6-digit hex
  if (hexColor.length === 6) {
    return `#${hexColor}`;
  }
  
  // Handle 8-digit hex (with alpha) by removing alpha
  if (hexColor.length === 8) {
    return `#${hexColor.substring(0, 6)}`;
  }
  
  // Invalid hex
  return null;
}

// Check if a string is a valid named color
function isNamedColor(colorName) {
  // Create a temporary element to check if the color is valid
  const temp = document.createElement('div');
  temp.style.color = colorName;
  
  return temp.style.color !== '';
}

// Convert a named color to hex
function convertNamedColorToHex(colorName) {
  // Create a temporary element and set its color
  const temp = document.createElement('div');
  temp.style.color = colorName;
  
  // Append to the document to get computed style
  document.body.appendChild(temp);
  
  // Get computed style
  const computedColor = window.getComputedStyle(temp).color;
  
  // Remove the element
  document.body.removeChild(temp);
  
  // Convert the computed RGB color to hex
  return convertRgbToHex(computedColor);
}

// Check if a color is valid and not too close to white or black
function isValidColor(color) {
  if (!color || color === '#000000' || color === '#FFFFFF') {
    return false;
  }
  
  // Convert to RGB to check brightness
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // Calculate brightness (perceived luminance)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Filter out colors that are too dark or too light
  return brightness > 20 && brightness < 235;
} 