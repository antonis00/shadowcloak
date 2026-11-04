// Types for the small part of the vendored build that the app uses.
export interface ClassicEditorInstance {
  getData(): string;
  setData(html: string): void;
  destroy(): Promise<void>;
  model: { document: { on(event: string, callback: () => void): void } };
  editing: { view: { document: { on(event: string, callback: () => void): void } } };
}

declare const ClassicEditor: {
  create(element: HTMLElement, config: object): Promise<ClassicEditorInstance>;
};

export default ClassicEditor;
