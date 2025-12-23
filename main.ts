import { Plugin, MarkdownView, Notice, Editor, MarkdownPostProcessorContext } from "obsidian";
import { ImageScaleSettings, DEFAULT_SETTINGS, ImageScaleSettingTab } from "./settings";
import { ImageResizer } from "./imageResizer";

export default class ImageScalePlugin extends Plugin {
	settings: ImageScaleSettings;
	private resizer: ImageResizer;
	private observer: MutationObserver | null = null;

	async onload() {
		await this.loadSettings();
		this.resizer = new ImageResizer(this.app, this, this.settings);
		this.addSettingTab(new ImageScaleSettingTab(this.app, this));
		this.updateHideLinkSyntax();

		this.registerMarkdownPostProcessor((element, context) => {
			const images = element.querySelectorAll("img");
			images.forEach((img: HTMLImageElement) => {
				this.resizer.makeImageResizable(img, context);
			});
		});

		this.app.workspace.onLayoutReady(() => {
			this.startObserving();
			this.processAllImages();
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.processAllImages();
			})
		);

		this.addCommand({
			id: "reset-image-size",
			name: "Reset size to original",
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const imageRegex = /!\[\[([^\]]+?)(?:\|\d+)?\]\]/g;
				let match;
				while ((match = imageRegex.exec(line)) !== null) {
					const start = match.index;
					const end = start + match[0].length;
					if (cursor.ch >= start && cursor.ch <= end) {
						const path = match[1].split('|')[0];
						const newImageMd = `![[${path}]]`;
						editor.replaceRange(newImageMd,
							{ line: cursor.line, ch: start },
							{ line: cursor.line, ch: end }
						);
						new Notice("Image size reset");
						return;
					}
				}
				new Notice("No image found at cursor");
			}
		});
	}

	onunload() {
		if (this.observer) {
			this.observer.disconnect();
		}
		document.body.classList.remove('hide-image-link-syntax');
	}

	updateHideLinkSyntax() {
		if (this.settings.hideLinkSyntax) {
			document.body.classList.add('hide-image-link-syntax');
		} else {
			document.body.classList.remove('hide-image-link-syntax');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private startObserving() {
		this.observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.addedNodes.length > 0) {
					mutation.addedNodes.forEach((node) => {
						if (node instanceof HTMLElement) {
							const images = node.querySelectorAll("img");
							images.forEach((img: HTMLImageElement) => {
								this.resizer.makeImageResizable(img, null);
							});
							if (node.tagName === "IMG") {
								this.resizer.makeImageResizable(node as HTMLImageElement, null);
							}
						}
					});
				}
			}
		});
		this.observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	private processAllImages() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;
		const container = activeView.contentEl;

		const images = container.querySelectorAll("img");
		images.forEach((img: HTMLImageElement) => {
			if (!img.dataset.imageScaleProcessed) {
				this.resizer.makeImageResizable(img, null);
			}
		});
	}
}
