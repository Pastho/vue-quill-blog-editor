import Quill from 'quill';
import ImageService from '../services/ImageService';

const Module = Quill.import('core/module');
const ImageBlot: any = Quill.import('formats/image');

type Corner = 'nw' | 'ne' | 'sw' | 'se';
type Align = 'left' | 'center' | 'right';

const ALIGN_VALUES: readonly Align[] = ['left', 'center', 'right'];

// Replaces Quill's default Image blot so an `image-align-{left,center,right}`
// class on the <img> is recognized as a native format. Applying it via an
// inline attributor instead would wrap the image in a span (the class would
// land on the wrapper, not the img) and our CSS wouldn't match. Reading the
// class in `formats()` and writing it in `format()` makes alignment a
// first-class image format that round-trips through delta and HTML.
class AlignedImage extends ImageBlot {
    static formats(domNode: HTMLElement) {
        const formats = ImageBlot.formats(domNode) || {};
        for (const align of ALIGN_VALUES) {
            if (domNode.classList.contains(`image-align-${align}`)) {
                formats['image-align'] = align;
                break;
            }
        }
        return formats;
    }

    format(name: string, value: any) {
        if (name === 'image-align') {
            const img = this.domNode as HTMLImageElement;
            ALIGN_VALUES.forEach(a => img.classList.remove(`image-align-${a}`));
            if (value && ALIGN_VALUES.includes(value)) {
                img.classList.add(`image-align-${value}`);
            }
        } else {
            super.format(name, value);
        }
    }
}

Quill.register({'formats/image': AlignedImage}, true);

interface DragState {
    handle: Corner;
    startX: number;
    startW: number;
    minW: number;
    maxW: number;
}

const HANDLE_SIZE = 12;
const MIN_WIDTH = 40;

class ImageHandler extends Module {
    private overlayEl: HTMLElement | null = null;
    private selectedImg: HTMLImageElement | null = null;
    private dragState: DragState | null = null;
    private rafPending = false;

    constructor(quill: Quill, options: any) {
        super(quill, options);

        this.setupImageClickHandler();
        this.setupDocumentClickHandler();
        this.setupRepositionHandlers();

        quill.on('text-change', (_delta, oldDelta) => {
            const oldImages = this.extractImageSources(oldDelta);
            const newImages = this.extractImageSources(quill.getContents());
            const deleted = oldImages.filter((url: string) => !newImages.includes(url));
            deleted.forEach(url => ImageService.delete(url));

            if (this.selectedImg && !this.quill.root.contains(this.selectedImg)) {
                this.clearSelection();
            } else if (this.selectedImg) {
                this.scheduleReposition();
            }
        });
    }

    extractImageSources(delta: any): string[] {
        const sources: string[] = [];
        (delta.ops || []).forEach((op: any) => {
            if (op.insert && op.insert.image) {
                sources.push(op.insert.image);
            }
        });
        return sources;
    }

    private setupImageClickHandler() {
        const editorEl = this.quill.root;
        editorEl.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.tagName === 'IMG') {
                e.stopPropagation();
                e.preventDefault();
                this.selectImage(target as HTMLImageElement);
            } else {
                this.clearSelection();
            }
        });
        // Prevent native drag of the image (interferes with our resize drag).
        editorEl.addEventListener('dragstart', (e: DragEvent) => {
            const t = e.target as HTMLElement;
            if (t && t.tagName === 'IMG') e.preventDefault();
        });
    }

    private setupDocumentClickHandler() {
        document.addEventListener('mousedown', (e) => {
            if (!this.overlayEl || !this.selectedImg) return;
            const target = e.target as Node;
            if (this.overlayEl.contains(target)) return;
            if (this.selectedImg === target) return;
            this.clearSelection();
        });
    }

    private setupRepositionHandlers() {
        const reposition = () => this.scheduleReposition();
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
    }

    private selectImage(img: HTMLImageElement) {
        if (this.selectedImg === img) return;
        this.clearSelection();
        this.selectedImg = img;
        img.classList.add('image-selected');
        this.buildOverlay();
        this.scheduleReposition();
    }

    private clearSelection() {
        if (this.selectedImg) {
            this.selectedImg.classList.remove('image-selected');
            this.selectedImg = null;
        }
        if (this.overlayEl) {
            this.overlayEl.remove();
            this.overlayEl = null;
        }
    }

    private buildOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'image-resize-overlay';
        Object.assign(overlay.style, {
            position: 'absolute',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            border: '2px solid #1976d2',
            borderRadius: '2px',
            zIndex: '9999',
        } as Partial<CSSStyleDeclaration>);

        const corners: Corner[] = ['nw', 'ne', 'sw', 'se'];
        for (const corner of corners) {
            overlay.appendChild(this.makeHandle(corner));
        }
        overlay.appendChild(this.buildToolbar());

        document.body.appendChild(overlay);
        this.overlayEl = overlay;
    }

    private makeHandle(corner: Corner): HTMLElement {
        const h = document.createElement('div');
        h.dataset.handle = corner;
        Object.assign(h.style, {
            position: 'absolute',
            width: `${HANDLE_SIZE}px`,
            height: `${HANDLE_SIZE}px`,
            background: '#fff',
            border: '2px solid #1976d2',
            borderRadius: '2px',
            pointerEvents: 'auto',
            cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
            boxSizing: 'border-box',
        } as Partial<CSSStyleDeclaration>);
        const offset = `${-HANDLE_SIZE / 2}px`;
        if (corner.includes('n')) h.style.top = offset; else h.style.bottom = offset;
        if (corner.includes('w')) h.style.left = offset; else h.style.right = offset;

        h.addEventListener('mousedown', (ev) => this.startDrag(ev, corner));
        return h;
    }

    private buildToolbar(): HTMLElement {
        const tb = document.createElement('div');
        Object.assign(tb.style, {
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '2px',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
            font: '13px sans-serif',
            whiteSpace: 'nowrap',
        } as Partial<CSSStyleDeclaration>);

        const mkBtn = (label: string, title: string, onClick: (ev: MouseEvent) => void) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.title = title;
            b.textContent = label;
            Object.assign(b.style, {
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: '3px',
                font: 'inherit',
                lineHeight: '1',
            } as Partial<CSSStyleDeclaration>);
            b.addEventListener('mouseenter', () => { b.style.background = '#f3f4f6'; });
            b.addEventListener('mouseleave', () => { b.style.background = 'none'; });
            b.addEventListener('mousedown', (ev) => { ev.stopPropagation(); ev.preventDefault(); });
            b.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); onClick(ev); });
            return b;
        };

        tb.appendChild(mkBtn('⬅', 'Align left', () => this.setAlignment('left')));
        tb.appendChild(mkBtn('⬍', 'Center', () => this.setAlignment('center')));
        tb.appendChild(mkBtn('➡', 'Align right', () => this.setAlignment('right')));

        const sep = document.createElement('span');
        sep.style.cssText = 'width:1px;background:#ddd;margin:2px 4px;';
        tb.appendChild(sep);

        tb.appendChild(mkBtn('Reset', 'Clear alignment & size', () => this.resetImage()));
        return tb;
    }

    private setAlignment(align: Align) {
        if (!this.selectedImg) return;
        const blot = (Quill as any).find(this.selectedImg);
        if (!blot) return;
        const index = this.quill.getIndex(blot);
        this.quill.formatText(index, 1, 'image-align', align, 'user');
        // The custom Image blot mutates classList in place, so the DOM node is
        // preserved — just re-position the overlay around the image's new rect.
        requestAnimationFrame(() => this.scheduleReposition());
    }

    private resetImage() {
        if (!this.selectedImg) return;
        const blot = (Quill as any).find(this.selectedImg);
        if (!blot) return;
        const index = this.quill.getIndex(blot);
        this.quill.formatText(index, 1, 'image-align', false, 'user');
        this.selectedImg.removeAttribute('width');
        this.selectedImg.removeAttribute('height');
        this.quill.update('user');
        requestAnimationFrame(() => this.scheduleReposition());
    }

    private startDrag(ev: MouseEvent, corner: Corner) {
        if (!this.selectedImg) return;
        ev.preventDefault();
        ev.stopPropagation();
        const rect = this.selectedImg.getBoundingClientRect();
        const containerWidth = this.quill.root.clientWidth;
        this.dragState = {
            handle: corner,
            startX: ev.clientX,
            startW: rect.width,
            minW: MIN_WIDTH,
            maxW: containerWidth,
        };
        const onMove = (e: MouseEvent) => this.onDrag(e);
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            this.endDrag();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    private onDrag(e: MouseEvent) {
        if (!this.dragState || !this.selectedImg) return;
        const {handle, startX, startW, minW, maxW} = this.dragState;
        const direction = handle.includes('w') ? -1 : 1;
        const dx = (e.clientX - startX) * direction;
        const newW = Math.round(Math.min(Math.max(startW + dx, minW), maxW));
        // Aspect ratio is preserved by leaving height unset and relying on
        // `.ql-editor img { height: auto }` from the playground stylesheet.
        this.selectedImg.removeAttribute('height');
        this.selectedImg.style.height = '';
        this.selectedImg.setAttribute('width', String(newW));
        this.scheduleReposition();
    }

    private endDrag() {
        this.dragState = null;
        // Force Quill to capture the attribute mutation in its delta.
        this.quill.update('user');
    }

    private scheduleReposition() {
        if (this.rafPending) return;
        this.rafPending = true;
        requestAnimationFrame(() => {
            this.rafPending = false;
            this.repositionOverlay();
        });
    }

    private repositionOverlay() {
        if (!this.overlayEl || !this.selectedImg) return;
        const rect = this.selectedImg.getBoundingClientRect();
        Object.assign(this.overlayEl.style, {
            top: `${window.scrollY + rect.top}px`,
            left: `${window.scrollX + rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
        });
    }
}

export default ImageHandler;
