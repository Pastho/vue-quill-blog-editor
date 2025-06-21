import Quill from "quill";
import ImageService from '../services/ImageService';

const Module = Quill.import('core/module');

/**
 * The ImageHandler class is a custom module for handling image-related functionality within a Quill editor.
 * It allows users to interact with images embedded in the editor, including selecting images, displaying
 * a context menu for image-specific actions, and resizing images.
 *
 * This module also listens for content changes in the editor to detect and handle image removals.
 * It integrates with an external `ImageService` to perform clean-up tasks when an image is deleted.
 *
 * Example usage and integration should be handled externally.
 */
class ImageHandler extends Module {
    private contextMenuEl: HTMLElement | null = null;

    /**
     * Constructor for the custom image handler.
     *
     * @param {Quill} quill - The Quill editor instance.
     * @param {any} options - Configuration options for the image handler.
     * @return {void} Initializes the image handler, sets up event listeners, and manages image removal detection.
     */
    constructor(quill: Quill, options: any) {
        super(quill, options);
        this.setupImageClickHandler();
        this.setupDocumentClickHandler();

        // Listen for content changes to detect image removals
        quill.on('text-change', (delta: any, oldDelta: any, source: any) => {
            const oldImages = this.extractImageSources(oldDelta);
            const newImages = this.extractImageSources(quill.getContents());
            // Image URLs that existed before but not anymore = removed
            const deleted = oldImages.filter((url: string) => !newImages.includes(url));
            deleted.forEach(url => ImageService.delete(url));
        });

    }

    /**
     * Extracts image sources from a given Quill delta object.
     *
     * @param {any} delta - The Quill delta object containing operations.
     * @return {string[]} An array of image source URLs extracted from the delta.
     */
    extractImageSources(delta: any): string[] {
        const sources: string[] = [];
        (delta.ops || []).forEach((op: any) => {
            if (op.insert && op.insert.image) {
                sources.push(op.insert.image);
            }
        });
        return sources;
    }


    /**
     * Attaches a click event handler to the editor to manage image selection and context menu behavior.
     * When an image is clicked, the handler applies a 'selected' class to the image and triggers a context menu.
     * Clicking elsewhere in the editor deselects images and closes the context menu.
     *
     * @return {void} This method does not return a value.
     */
    setupImageClickHandler() {
        const editorEl = this.quill.root;
        if (!editorEl) return;

        editorEl.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.tagName === 'IMG') {
                // Deselect other images
                editorEl.querySelectorAll('img.image-selected').forEach((img: Element) => {
                    img.classList.remove('image-selected');
                });
                // Select clicked image
                target.classList.add('image-selected');
                e.stopPropagation();
                this.openContextMenu(target, e);
            } else {
                editorEl.querySelectorAll('img.image-selected').forEach((img: Element) => {
                    img.classList.remove('image-selected');
                });
                this.closeContextMenu();
            }
        });
    }

    /**
     * Sets up a click event handler on the document. This handler closes the context menu
     * and deselects any selected images when a click occurs outside of the context menu.
     *
     * @return {void} Does not return a value.
     */
    setupDocumentClickHandler = () => {
        document.addEventListener('click', (e) => {
            if (this.contextMenuEl && !this.contextMenuEl.contains(e.target as Node)) {
                this.closeContextMenu();
                // Also deselect image
                const editorEl = this.quill.root;
                editorEl.querySelectorAll('img.image-selected').forEach((img: Element) => {
                    img.classList.remove('image-selected');
                });
            }
        });
    };

    /**
     * Opens a context menu near the provided image element with options to adjust the image size.
     *
     * @param {HTMLElement} img - The image element near which the context menu will be displayed.
     * @param {MouseEvent} e - The mouse event triggering the context menu.
     * @return {void} This method does not return a value.
     */
    openContextMenu = (img: HTMLElement, e: MouseEvent) => {
        this.closeContextMenu();
        const menu = document.createElement('div');
        menu.style.position = 'absolute';
        menu.style.zIndex = '10000';
        menu.style.background = '#fff';
        menu.style.border = '1px solid #ccc';
        menu.style.padding = '4px 10px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.11)';
        menu.style.borderRadius = '5px';
        menu.style.fontSize = '14px';
        menu.style.display = 'flex';
        menu.style.gap = '6px';
        menu.style.minWidth = 'fit-content';
        menu.style.alignItems = 'center';

        const btnStyles = `
            background: none;
            border: none;
            padding: 4px 10px;
            cursor: pointer;
            border-radius: 4px;
            font: inherit;
            transition: background 0.15s;
        `;

        const makeBtn = (label: string, size: 'small' | 'medium' | 'large') => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            btn.setAttribute('style', btnStyles);
            btn.onmouseover = () => { btn.style.background = '#f3f4f6'; };
            btn.onmouseout = () => { btn.style.background = 'none'; };
            btn.onclick = (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                this.adjustImageSize(size);
                this.closeContextMenu();
            };
            return btn;
        };

        menu.appendChild(makeBtn("Small", "small"));
        menu.appendChild(makeBtn("Medium", "medium"));
        menu.appendChild(makeBtn("Large", "large"));

        document.body.appendChild(menu);
        this.contextMenuEl = menu;

        // Position menu horizontally at the top of the image
        const rect = img.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        menu.style.left = `${window.scrollX + rect.left + (rect.width - menu.offsetWidth) / 2}px`;
        menu.style.top = `${window.scrollY + rect.top - menu.offsetHeight - 6}px`;

        // Safety: Show under image if not enough space above
        if (rect.top - menu.offsetHeight - 6 < 0) {
            menu.style.top = `${window.scrollY + rect.bottom + 6}px`;
        }
    };

    /**
     * Closes the context menu by removing its associated DOM element
     * and setting the reference to null.
     *
     * @return {void} No value is returned.
     */
    closeContextMenu = () => {
        if (this.contextMenuEl) {
            this.contextMenuEl.remove();
            this.contextMenuEl = null;
        }
    };

    /**
     * Adjusts the size of a selected image within the editor by applying specific CSS classes.
     *
     * @param {'small' | 'medium' | 'large'} size - The desired size of the image.
     *                                              'small', 'medium', and 'large' correspond to specific width classes.
     * @return {void} This method does not return a value.
     */
    adjustImageSize = (size: 'small' | 'medium' | 'large') => {
        const editorEl = this.quill.root;
        if (!editorEl) return;
        const selectedImage = editorEl.querySelector('img.image-selected') as HTMLImageElement | null;
        if (!selectedImage) return;

        selectedImage.classList.remove('w-3/5', 'w-4/5', 'w-full');
        switch (size) {
            case 'small':
                selectedImage.classList.add('w-3/5');
                break;
            case 'medium':
                selectedImage.classList.add('w-4/5');
                break;
            case 'large':
                selectedImage.classList.add('w-full');
                break;
        }
    };
}

export default ImageHandler;