import {describe, it, expect, beforeEach, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import QuillBlogEditor from '../../src/QuillBlogEditor.vue'
import {nextTick} from 'vue'

let quillEventHandlers: Record<string, Function> = {};

vi.mock('quill', () => {
    class MockQuill {
        static register = vi.fn();
        static import = vi.fn().mockImplementation(() => function () {
        });
        root: HTMLElement;
        clipboard: { dangerouslyPasteHTML: any };
        on: any;
        getLeaf = vi.fn().mockReturnValue([{parent: {tagName: 'P'}}]);
        insertEmbed = vi.fn();
        setSelection = vi.fn();

        constructor(container: HTMLElement, options: any) {
            container.innerHTML = '<div class="ql-editor">mock editor</div>';
            this.root = container;
            this.clipboard = {
                dangerouslyPasteHTML: vi.fn(),
            };

            // Capture event handlers in a shared object
            this.on = (event: string, handler: Function) => {
                quillEventHandlers[event] = handler;
                return this;
            };
        }
    }

    return {
        __esModule: true,
        default: MockQuill,
    };
});


describe('QuillBlogEditor', () => {
    it('mounts and renders editor container', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {
                modelValue: '<p>Initial</p>'
            }
        })
        await nextTick()
        expect(wrapper.find('.editor').exists()).toBe(true)
    })

    it('emits update:modelValue and text-change on "text-change" event', async () => {
        // Clear handlers before each run!
        quillEventHandlers = {};

        const wrapper = mount(QuillBlogEditor, {
            props: {modelValue: '<p>Initial</p>'}
        });
        await nextTick();

        const quill = (wrapper.vm as any).quill;
        expect(quill).toBeTruthy();

        // Simulate user input
        quill.root.innerHTML = '<p>Changed</p>';

        // Now call the registered handler directly!
        quillEventHandlers['text-change']();

        await nextTick();
        expect(wrapper.emitted()['update:modelValue']).toBeTruthy();
        expect(wrapper.emitted()['text-change']).toBeTruthy();
    });


    it('emits focus and blur on selection-change', async () => {
        // Reset handlers before this test run
        quillEventHandlers = {};

        const wrapper = mount(QuillBlogEditor, {
            props: {
                modelValue: '<p>Initial</p>'
            }
        });
        await nextTick();

        // Simulate a focus event
        quillEventHandlers['selection-change']({index: 0});
        await nextTick();
        expect(wrapper.emitted()['focus']).toBeTruthy();

        // Simulate a blur event
        quillEventHandlers['selection-change'](null);
        await nextTick();
        expect(wrapper.emitted()['blur']).toBeTruthy();
    });


    it('emits ready with the Quill instance', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {
                modelValue: '<p>Initial</p>'
            }
        })
        // Await for any nextTick emissions after mounted
        await nextTick()
        const readyCalls = wrapper.emitted('ready')
        expect(readyCalls).toBeTruthy()
        // The emitted value should be the quill mock
        expect(readyCalls![0][0]).toBe((wrapper.vm as any).quill)
    })

    it('updates editor when modelValue prop changes', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {
                modelValue: '<p>Initial</p>'
            }
        });
        await nextTick();

        const quill = (wrapper.vm as any).quill;
        expect(quill).toBeTruthy();

        const spy = quill.clipboard.dangerouslyPasteHTML;

        await wrapper.setProps({modelValue: '<p>Updated</p>'});
        expect(spy).toHaveBeenCalledWith('<p>Updated</p>');
    });

    it('does not update editor if modelValue equals Quill HTML', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {
                modelValue: '<p>Same</p>'
            }
        });
        await nextTick();

        const quill = (wrapper.vm as any).quill;
        expect(quill).toBeTruthy();

        quill.root.innerHTML = '<p>Same</p>';
        const spy = quill.clipboard.dangerouslyPasteHTML;

        // Clear previous calls made during mount
        spy.mockClear();

        await wrapper.setProps({modelValue: '<p>Same</p>'});
        expect(spy).not.toHaveBeenCalled();
    });
})