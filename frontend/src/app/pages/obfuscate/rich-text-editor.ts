import { AfterViewInit, Component, ElementRef, OnDestroy, forwardRef, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import type { ClassicEditorInstance } from '../../../assets/ckeditor/ckeditor';

const TOOLBAR = [
  'heading', '|', 'bold', 'italic', 'underline', '|', 'fontColor', 'fontBackgroundColor', '|',
  'indent', 'outdent', '|', 'link', '|', 'bulletedList', 'numberedList', '|', 'undo', 'redo',
];

/** Lets a form control hold the vendored CKEditor build's HTML. */
@Component({
  selector: 'app-rich-text-editor',
  template: `<div #host></div>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichTextEditor), multi: true }],
})
export class RichTextEditor implements AfterViewInit, ControlValueAccessor, OnDestroy {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private editor?: ClassicEditorInstance;
  private destroyed = false;
  private value = '';
  private onChange: (html: string) => void = () => {};
  private onTouched: () => void = () => {};

  async ngAfterViewInit(): Promise<void> {
    const { default: ClassicEditor } = await import('../../../assets/ckeditor/ckeditor.js');
    const editor = await ClassicEditor.create(this.host().nativeElement, {
      toolbar: { items: TOOLBAR },
      language: 'en',
      initialData: this.value,
    });
    if (this.destroyed) {
      await editor.destroy();
      return;
    }
    this.editor = editor;
    editor.model.document.on('change:data', () => {
      this.value = editor.getData();
      this.onChange(this.value);
    });
    editor.editing.view.document.on('blur', () => this.onTouched());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.editor?.destroy();
  }

  writeValue(html: string | null): void {
    this.value = html ?? '';
    this.editor?.setData(this.value);
  }

  registerOnChange(onChange: (html: string) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }
}
