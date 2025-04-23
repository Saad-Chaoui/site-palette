# 🎨 Site Palette

<div align="center">

![Site Palette Logo](images/icon128.jpg)

**Extract, analyze and save color palettes from any website with a single click.**

[![GitHub](https://img.shields.io/badge/github-Saad--Chaoui-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Saad-Chaoui)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)

</div>

## ✨ Features

- **🔍 Smart Color Extraction** - Intelligently identifies the primary colors from any webpage
- **🖌️ Multiple Color Formats** - Copy colors in HEX, RGB, or HSL formats
- **💾 Save Palettes** - Store your favorite color schemes for future reference
- **📤 Export Options** - Export palettes as JSON, CSS variables, or SCSS variables
- **🔄 Color Relationships** - Automatically generates complementary, analogous, triadic, and monochromatic color variations
- **🎯 One-Click Copy** - Easily copy any color with a single click
- **🖥️ Modern UI** - Clean, intuitive interface with smooth animations

## 📸 Screenshots

<div align="center">
  <p><em>Screenshots will be added here</em></p>
</div>

## 🚀 Installation

### Chrome Web Store (Coming Soon)

Site Palette will soon be available on the Chrome Web Store.

### Manual Installation (Developer Mode)

1. **Download** this repository (ZIP or `git clone`)
2. **Open** Chrome and navigate to `chrome://extensions/`
3. **Enable** "Developer mode" (toggle in the top-right corner)
4. **Click** "Load unpacked" and select the extension directory
5. The **Site Palette** icon should now appear in your browser toolbar

## 💻 Usage

1. **Navigate** to any website you want to analyze
2. **Click** the Site Palette icon in your browser toolbar
3. **Press** "Extract Colors" to analyze the current page
4. **View** the extracted color palette with detailed information
5. **Change** formats using the dropdown selector
6. **Copy** colors with a single click
7. **Save** interesting palettes for future reference
8. **Export** palettes in various formats

## 🔧 Development

### Project Structure

```
site-palette/
├── manifest.json     # Extension configuration
├── popup.html        # Main user interface
├── popup.js          # Interface functionality
├── popup.css         # Styling and animations
├── content.js        # Page color extraction logic
├── background.js     # Background service worker
└── images/           # Extension icons
```

### Technologies Used

- **JavaScript** - Core functionality and color analysis
- **CSS3** - Modern styling with animations and transitions
- **Chrome Extension APIs** - For browser integration
- **Color Theory Algorithms** - For relationship generation

### Local Development

1. Make changes to the relevant files
2. Reload the extension from `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

Created and maintained by [Saad Chaoui](https://github.com/Saad-Chaoui).

---

<div align="center">
  <sub>If you found this useful, consider giving it a ⭐ on GitHub!</sub>
</div> 