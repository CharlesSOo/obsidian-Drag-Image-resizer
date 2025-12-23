import { App, MarkdownPostProcessorContext, Notice, Plugin, MarkdownView } from 'obsidian';
import { ImageScaleSettings } from './settings';

export class ImageResizer {
	private app: App;
	private plugin: Plugin;
	private settings: ImageScaleSettings;
	private isResizing = false;
	private activeImage: HTMLImageElement | null = null;
	private selectedImage: HTMLImageElement | null = null;
	private handleContainer: HTMLElement | null = null;
	private handles: HTMLElement[] = [];
	private startX = 0;
	private startY = 0;
	private startWidth = 0;
	private startHeight = 0;
	private aspectRatio = 1;
	private currentHandle = '';
	private processedImages = new WeakSet<HTMLImageElement>();
	private boundHandleKeydown: (e: KeyboardEvent) => void;
	private boundHandleClickOutside: (e: MouseEvent) => void;

	constructor(app: App, plugin: Plugin, settings: ImageScaleSettings) {
		this.app = app;
		this.plugin = plugin;
		this.settings = settings;

		// Bind event handlers
		this.boundHandleKeydown = this.handleKeydown.bind(this);
		this.boundHandleClickOutside = this.handleClickOutside.bind(this);

		// Add global listeners
		document.addEventListener('keydown', this.boundHandleKeydown);
		document.addEventListener('click', this.boundHandleClickOutside, true);
	}

	cleanup() {
		this.removeHandles();
		this.deselectImage();
		this.isResizing = false;
		this.activeImage = null;
		document.removeEventListener('keydown', this.boundHandleKeydown);
		document.removeEventListener('click', this.boundHandleClickOutside, true);
	}

	private selectImage(image: HTMLImageElement) {
		if (!this.settings.enableClickToDelete) return;
		this.deselectImage();
		this.selectedImage = image;
		image.style.outline = '2px solid #4a9eff';
		image.style.outlineOffset = '2px';
	}

	private deselectImage() {
		if (this.selectedImage) {
			this.selectedImage.style.outline = '';
			this.selectedImage.style.outlineOffset = '';
			this.selectedImage = null;
		}
	}

	private handleKeydown(e: KeyboardEvent) {
		if (!this.selectedImage) return;
		if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault();
			e.stopPropagation();
			this.deleteSelectedImage();
		} else if (e.key === 'Escape') {
			this.deselectImage();
		}
	}

	private handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		// Don't deselect if clicking on an image or resize handle
		if (target.tagName === 'IMG' || target.closest('.image-resize-handle-container')) {
			return;
		}
		this.deselectImage();
	}

	private async deleteSelectedImage() {
		if (!this.selectedImage) return;

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		const content = editor.getValue();
		const lines = content.split('\n');

		// Get the image source to find the right markdown
		const imgSrc = this.selectedImage.getAttribute('src') || '';
		const imgAlt = this.selectedImage.getAttribute('alt') || '';

		// Try to find the image in markdown
		let deleted = false;
		for (let i = 0; i < lines.length; i++) {
			// Match ![[filename|width]] or ![[filename]]
			const match = lines[i].match(/!\[\[([^\]]+?)(?:\|\d+(?:x\d+)?)?\]\]/);
			if (match) {
				const imagePath = match[1];
				// Check if this line's image matches (by alt text which contains filename)
				if (imgAlt.includes(imagePath) || imagePath.includes(imgAlt) || imgSrc.includes(encodeURIComponent(imagePath))) {
					lines[i] = lines[i].replace(/!\[\[([^\]]+?)(?:\|\d+(?:x\d+)?)?\]\]/, '');
					deleted = true;
					break;
				}
			}
		}

		if (deleted) {
			this.deselectImage();
			editor.setValue(lines.join('\n'));
			new Notice('Image deleted');
		}
	}

	toggleImageResize(img: HTMLImageElement) {
		// Not used
	}

	makeImageResizable(img: HTMLImageElement | HTMLIFrameElement | HTMLDivElement, context: MarkdownPostProcessorContext | null) {
		if (img.tagName !== 'IMG') return;
		if (this.processedImages.has(img as HTMLImageElement)) return;

		this.processedImages.add(img as HTMLImageElement);
		const image = img as HTMLImageElement;

		// Block Obsidian's image zoom/magnifier (click) and select image
		image.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			this.selectImage(image);
		}, { capture: true });

		// Block Obsidian's hold-to-preview popup (mousedown)
		image.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		}, { capture: true });

		// Show floating handles on hover
		image.addEventListener('mouseenter', () => {
			if (this.isResizing) return;
			this.showHandles(image);
		});

		image.addEventListener('mouseleave', (e) => {
			if (this.isResizing) return;
			// Only remove if not moving to a handle
			const relatedTarget = e.relatedTarget as HTMLElement;
			if (!relatedTarget?.closest('.image-resize-handle-container')) {
				this.removeHandles();
			}
		});
	}

	private showHandles(image: HTMLImageElement) {
		if (this.activeImage === image && this.handleContainer) return;

		this.removeHandles();
		this.activeImage = image;
		this.aspectRatio = image.naturalWidth / image.naturalHeight;

		// Get image position
		const rect = image.getBoundingClientRect();

		// Create a floating container for handles (appended to body, not modifying image DOM)
		this.handleContainer = document.createElement('div');
		this.handleContainer.className = 'image-resize-handle-container';
		this.handleContainer.style.cssText = `
			position: fixed;
			top: ${rect.top}px;
			left: ${rect.left}px;
			width: ${rect.width}px;
			height: ${rect.height}px;
			pointer-events: none;
			z-index: 10000;
		`;
		document.body.appendChild(this.handleContainer);

		// Create single resize handle in bottom-right corner with icon
		const handle = document.createElement('div');
		handle.className = 'image-resize-handle';
		handle.style.cssText = `
			position: absolute;
			bottom: 4px;
			right: 4px;
			width: 24px;
			height: 24px;
			background: rgba(0, 0, 0, 0.6);
			border-radius: 4px;
			cursor: se-resize;
			pointer-events: auto;
			display: flex;
			align-items: center;
			justify-content: center;
		`;

		// Add dot grid resize icon
		handle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="white">
			<circle cx="2" cy="2" r="1.5"/>
			<circle cx="6" cy="2" r="1.5"/>
			<circle cx="10" cy="2" r="1.5"/>
			<circle cx="2" cy="6" r="1.5"/>
			<circle cx="6" cy="6" r="1.5"/>
			<circle cx="10" cy="6" r="1.5"/>
			<circle cx="2" cy="10" r="1.5"/>
			<circle cx="6" cy="10" r="1.5"/>
			<circle cx="10" cy="10" r="1.5"/>
		</svg>`;

		handle.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('[ImageResizer] Handle clicked: se');
			this.startResize(e, 'se');
		});

		this.handleContainer!.appendChild(handle);
		this.handles.push(handle);

		// Remove handles when mouse leaves the handle container
		this.handleContainer.addEventListener('mouseleave', (e) => {
			if (this.isResizing) return;
			const relatedTarget = e.relatedTarget as HTMLElement;
			// Check if moving back to the image
			if (relatedTarget !== this.activeImage) {
				this.removeHandles();
			}
		});
	}

	private removeHandles() {
		if (this.isResizing) return;

		if (this.handleContainer) {
			this.handleContainer.remove();
			this.handleContainer = null;
		}
		this.handles = [];
		this.activeImage = null;
	}

	private updateHandlePosition() {
		if (!this.activeImage || !this.handleContainer) return;
		const rect = this.activeImage.getBoundingClientRect();
		this.handleContainer.style.top = `${rect.top}px`;
		this.handleContainer.style.left = `${rect.left}px`;
		this.handleContainer.style.width = `${rect.width}px`;
		this.handleContainer.style.height = `${rect.height}px`;
	}

	private startResize(e: MouseEvent, corner: string) {
		if (!this.activeImage) return;

		this.isResizing = true;
		this.currentHandle = corner;
		this.startX = e.clientX;
		this.startY = e.clientY;
		this.startWidth = this.activeImage.width || this.activeImage.clientWidth;
		this.startHeight = this.activeImage.height || this.activeImage.clientHeight;

		// Visual feedback
		this.activeImage.style.outline = '2px solid #4a9eff';

		const onMouseMove = (e: MouseEvent) => {
			if (!this.isResizing || !this.activeImage) return;

			const deltaX = e.clientX - this.startX;
			let newWidth = Math.max(this.startWidth + deltaX, this.settings.minWidth);
			const newHeight = newWidth / this.aspectRatio;

			this.activeImage.style.width = `${Math.round(newWidth)}px`;
			this.activeImage.style.height = `${Math.round(newHeight)}px`;

			// Update handle position to follow the resizing image
			this.updateHandlePosition();
		};

		const onMouseUp = async () => {
			console.log('[ImageResizer] mouseup - saving');

			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);

			if (this.activeImage) {
				this.activeImage.style.outline = '';
				const width = Math.round(this.activeImage.clientWidth);

				// Save reference before cleanup
				const imageToUpdate = this.activeImage;

				this.isResizing = false;
				this.removeHandles();

				await this.updateMarkdown(imageToUpdate, width);
			} else {
				this.isResizing = false;
				this.removeHandles();
			}
		};

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	}

	private async updateMarkdown(img: HTMLImageElement, width: number) {
		const file = this.app.workspace.getActiveFile();
		if (!file) return;

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		const content = editor.getValue();
		const lines = content.split('\n');
		let updated = false;

		for (let i = 0; i < lines.length; i++) {
			let newLine = lines[i];

			newLine = newLine.replace(/!\[\[([^\]]+?)(?:\|\d+(?:x\d+)?)?\]\]/g, (match, path) => {
				updated = true;
				return `![[${path}|${width}]]`;
			});

			if (newLine !== lines[i]) {
				lines[i] = newLine;
			}
		}

		if (updated) {
			editor.setValue(lines.join('\n'));
			new Notice(`Resized to ${width}px`);
		}
	}
}
