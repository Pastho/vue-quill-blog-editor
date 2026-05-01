import {describe, it, expect, vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import Quill from 'quill'
import QuillBlogEditor from '../../src/QuillBlogEditor.vue'

// jsdom does not implement getBoundingClientRect with sensible defaults; some
// Quill internals call into it during selection updates. Provide a stub so the
// component mounts cleanly under jsdom.
if (typeof Range !== 'undefined' && !Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => ({
        x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0,
        toJSON: () => ({}),
    }) as DOMRect
    Range.prototype.getClientRects = () => ({
        length: 0, item: () => null, [Symbol.iterator]: function* () {},
    }) as unknown as DOMRectList
}

describe('QuillBlogEditor (real Quill)', () => {
    it('round-trips initial HTML through dangerouslyPasteHTML', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {modelValue: '<p>Hello</p>'},
            attachTo: document.body,
        })
        await nextTick()
        await nextTick()

        const root = wrapper.find('.ql-editor').element as HTMLElement
        expect(root.innerHTML).toContain('Hello')
        wrapper.unmount()
    })

    it('shift+enter inserts a <br> via the soft-break handler', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {modelValue: '<p>Hello</p>'},
            attachTo: document.body,
        })
        await nextTick()
        await nextTick()

        const quill = (wrapper.vm as any).quill as Quill
        expect(quill).toBeTruthy()

        quill.setSelection(5, 0)
        const bindings = (quill.keyboard as any).bindings as Record<string, any[]>
        const enterBindings = bindings['Enter'] || bindings[13] || []
        const shiftEnter = enterBindings.find((b: any) => b.shiftKey === true)
        expect(shiftEnter).toBeTruthy()
        shiftEnter.handler.call({quill}, {index: 5, length: 0}, {})

        expect(quill.root.innerHTML).toContain('<br>')
        wrapper.unmount()
    })

    it('paste matcher converts <br> in pasted HTML into a soft-break embed', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {modelValue: ''},
            attachTo: document.body,
        })
        await nextTick()
        await nextTick()

        const quill = (wrapper.vm as any).quill as Quill
        quill.clipboard.dangerouslyPasteHTML('<p>line1<br>line2</p>')
        await nextTick()

        expect(quill.root.innerHTML).toContain('line1')
        expect(quill.root.innerHTML).toContain('line2')
        expect(quill.root.innerHTML).toContain('<br>')
        wrapper.unmount()
    })

    it('consumer modules.toolbar overrides the resolved preset', async () => {
        const customToolbar = [['bold']]
        const wrapper = mount(QuillBlogEditor, {
            props: {
                modelValue: '',
                toolbar: 'full',
                options: {modules: {toolbar: customToolbar}},
            },
            attachTo: document.body,
        })
        await nextTick()
        await nextTick()

        const toolbarEl = wrapper.find('.ql-toolbar')
        expect(toolbarEl.exists()).toBe(true)
        // 'full' preset would render an <h1>/<h2>/<h3> picker; bold-only override should not.
        expect(toolbarEl.find('.ql-header').exists()).toBe(false)
        expect(toolbarEl.find('.ql-bold').exists()).toBe(true)
        wrapper.unmount()
    })

    it('modelValue echoed from text-change does not re-paste (preserves cursor)', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {modelValue: '<p>seed</p>'},
            attachTo: document.body,
        })
        await nextTick()
        await nextTick()

        const quill = (wrapper.vm as any).quill as Quill
        const pasteSpy = vi.spyOn(quill.clipboard, 'dangerouslyPasteHTML')

        // Simulate user typing — Quill emits text-change which the component
        // re-emits as update:modelValue. Echo that back as the prop.
        quill.insertText(0, 'X', Quill.sources.USER)
        await nextTick()
        const echoed = (wrapper.emitted('update:modelValue')!.at(-1) as string[])[0]

        await wrapper.setProps({modelValue: echoed})
        await nextTick()

        expect(pasteSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('toggles readOnly at runtime via quill.enable', async () => {
        const wrapper = mount(QuillBlogEditor, {
            props: {modelValue: '', readOnly: false},
            attachTo: document.body,
        })
        await nextTick()
        await nextTick()

        const quill = (wrapper.vm as any).quill as Quill
        expect(quill.isEnabled()).toBe(true)

        await wrapper.setProps({readOnly: true})
        expect(quill.isEnabled()).toBe(false)

        await wrapper.setProps({readOnly: false})
        expect(quill.isEnabled()).toBe(true)
        wrapper.unmount()
    })

    it('warns when given an unknown toolbar preset string', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const wrapper = mount(QuillBlogEditor, {
            props: {modelValue: '', toolbar: 'definitely-not-a-preset'},
            attachTo: document.body,
        })
        await nextTick()
        await nextTick()
        expect(warnSpy).toHaveBeenCalled()
        warnSpy.mockRestore()
        wrapper.unmount()
    })
})
