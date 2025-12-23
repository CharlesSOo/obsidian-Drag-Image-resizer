# Drag & Drop Image Resizer for Obsidian

Resize images in Obsidian by dragging. Simple, intuitive, and non-intrusive.

## Features

- **Hover to reveal resize handle** - A dot-grid icon appears in the bottom-right corner when you hover over an image
- **Drag to resize** - Click and drag the handle to resize while maintaining aspect ratio
- **Auto-saves to markdown** - Automatically updates the image width in your markdown (`![[image.png|width]]`)
- **Blocks default behaviors** - No more accidental zooms or preview popups when interacting with images
- **Clean image display** - Hides the `![[image|width]]` syntax in Live Preview for a distraction-free experience
- **Click to select, Delete to remove** - Click an image to select it (blue outline), press Delete or Backspace to remove it

## Installation

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder called `drag-drop-image-resizer` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Enable the plugin in Obsidian Settings → Community Plugins

### From Source

```bash
git clone https://github.com/CharlesSOo/obsidian-Drag-Image-resizer-.git
cd obsidian-Drag-Image-resizer-
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugins folder.

## Usage

1. Hover over any image in your note
2. A resize icon (dot grid) appears in the bottom-right corner
3. Click and drag the icon to resize
4. Release to save - the markdown is automatically updated

## Settings

- **Maintain aspect ratio** - Keep proportions when resizing (default: on)
- **Show dimensions while resizing** - Display size during drag (default: on)
- **Hide link syntax** - Hide `![[image|width]]` in Live Preview for cleaner display (default: on)
- **Click to select and delete** - Click to select an image, Delete/Backspace to remove (default: on)
- **Minimum width/height** - Set minimum dimensions for resized images
- **Handle size** - Customize the resize handle size
- **Handle color** - Customize the resize handle color

## Credits

Based on [Obsidian Resizer](https://github.com/PixeroJan/obsidian-resizer) by Jan Sandström.

## Support

If you find this plugin useful, follow me on X (Twitter): [@_CharlesSo](https://twitter.com/_CharlesSo)

## License

MIT
