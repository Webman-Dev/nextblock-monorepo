import type { Editor } from '@tiptap/core';

export type PickedImage = {
  src: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
  blurDataURL?: string | null;
};

export type OpenImagePicker = () => Promise<PickedImage | null>;

export function setOpenImagePicker(editor: Editor, open?: OpenImagePicker) {
  (editor.storage as any).mediaPicker = { open };
}

export function getOpenImagePicker(editor: Editor): OpenImagePicker | undefined {
  return (editor.storage as any)?.mediaPicker?.open as OpenImagePicker | undefined;
}
