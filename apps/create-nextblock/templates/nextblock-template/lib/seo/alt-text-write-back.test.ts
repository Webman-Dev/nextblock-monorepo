import { describe, expect, it } from 'vitest';

import {
  altTextImageIdentity,
  resolveAltTextWriteBack,
  STALE_ALT_TEXT_MESSAGE,
} from './alt-text-write-back';

type ImageContent = {
  alt_text: string | null;
  caption: string | null;
  external_url?: string | null;
  media_id: string | null;
  object_key: string | null;
};

function content(overrides: Partial<ImageContent> = {}): ImageContent {
  return {
    alt_text: '',
    caption: '',
    external_url: null,
    media_id: 'media-1',
    object_key: 'uploads/harvest.jpg',
    ...overrides,
  };
}

describe('altTextImageIdentity', () => {
  it('identifies a stored image by its object key', () => {
    expect(altTextImageIdentity(content())).toBe('stored:uploads/harvest.jpg');
  });

  it('falls back to the editor selection while content has not echoed it back yet', () => {
    expect(altTextImageIdentity(content({ object_key: null }), 'uploads/just-picked.jpg')).toBe(
      'stored:uploads/just-picked.jpg'
    );
  });

  it('prefers the external URL, because that is the image the editor renders and sends', () => {
    expect(
      altTextImageIdentity(
        content({ external_url: 'https://images.example.com/a.jpg', object_key: 'uploads/old.jpg' }),
        'uploads/older.jpg'
      )
    ).toBe('external:https://images.example.com/a.jpg');
  });

  it('returns an empty identity when there is no image at all', () => {
    expect(altTextImageIdentity(content({ media_id: null, object_key: null }))).toBe('');
    expect(altTextImageIdentity(content({ object_key: '   ' }))).toBe('');
  });

  it('never confuses an external URL with an object key of the same text', () => {
    expect(altTextImageIdentity({ external_url: 'x', object_key: null })).not.toBe(
      altTextImageIdentity({ external_url: null, object_key: 'x' })
    );
  });
});

describe('resolveAltTextWriteBack', () => {
  it('writes the description into the CURRENT content, not the copy captured at click time', () => {
    // The caption was typed while the vision call was in flight. Merging into the captured
    // copy would silently revert it.
    const current = content({ caption: 'Typed while generating' });

    expect(
      resolveAltTextWriteBack({
        capturedIdentity: 'stored:uploads/harvest.jpg',
        currentContent: current,
        currentIdentity: 'stored:uploads/harvest.jpg',
        generatedAltText: 'A field of chamomile at dawn.',
        objectKey: 'uploads/harvest.jpg',
      })
    ).toEqual({
      alt_text: 'A field of chamomile at dawn.',
      caption: 'Typed while generating',
      external_url: null,
      media_id: 'media-1',
      object_key: 'uploads/harvest.jpg',
    });
  });

  it('writes object_key from the editor selection, matching the typed-alt-text shape exactly', () => {
    const result = resolveAltTextWriteBack({
      capturedIdentity: 'stored:uploads/just-picked.jpg',
      currentContent: content({ object_key: null }),
      currentIdentity: 'stored:uploads/just-picked.jpg',
      generatedAltText: 'Chamomile.',
      objectKey: 'uploads/just-picked.jpg',
    });

    expect(result?.object_key).toBe('uploads/just-picked.jpg');
  });

  it('drops the response when the image was replaced mid-flight', () => {
    // The regression this whole module exists for: alt text describing image A must never
    // be attached to image B.
    expect(
      resolveAltTextWriteBack({
        capturedIdentity: 'stored:uploads/harvest.jpg',
        currentContent: content({ object_key: 'uploads/packaging.jpg' }),
        currentIdentity: 'stored:uploads/packaging.jpg',
        generatedAltText: 'A field of chamomile at dawn.',
        objectKey: 'uploads/packaging.jpg',
      })
    ).toBeNull();
  });

  it('drops the response when the image was removed mid-flight, so nothing is resurrected', () => {
    expect(
      resolveAltTextWriteBack({
        capturedIdentity: 'stored:uploads/harvest.jpg',
        currentContent: content({ media_id: null, object_key: null }),
        currentIdentity: '',
        generatedAltText: 'A field of chamomile at dawn.',
        objectKey: null,
      })
    ).toBeNull();
  });

  it('drops the response when a stored image was swapped for an external URL', () => {
    const current = content({
      external_url: 'https://images.example.com/new.jpg',
      media_id: null,
      object_key: null,
    });

    expect(
      resolveAltTextWriteBack({
        capturedIdentity: 'stored:uploads/harvest.jpg',
        currentContent: current,
        currentIdentity: altTextImageIdentity(current),
        generatedAltText: 'A field of chamomile at dawn.',
        objectKey: null,
      })
    ).toBeNull();
  });

  it('refuses to treat two empty identities as a match', () => {
    expect(
      resolveAltTextWriteBack({
        capturedIdentity: '',
        currentContent: content({ media_id: null, object_key: null }),
        currentIdentity: '',
        generatedAltText: 'A field of chamomile at dawn.',
        objectKey: null,
      })
    ).toBeNull();
  });

  it('offers an explanation that tells the operator the description was discarded', () => {
    expect(STALE_ALT_TEXT_MESSAGE).toContain('discarded');
  });
});
