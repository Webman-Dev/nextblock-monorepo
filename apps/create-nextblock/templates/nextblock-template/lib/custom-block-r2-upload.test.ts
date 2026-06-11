import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getS3PresignClientMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
  getUserMock: vi.fn(),
  profileSingleMock: vi.fn(),
}));

vi.mock('@nextblock-cms/db/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUserMock,
    },
    from: () => ({
      eq: () => ({
        single: mocks.profileSingleMock,
      }),
      select: () => ({
        eq: () => ({
          single: mocks.profileSingleMock,
        }),
      }),
    }),
  }),
}));

vi.mock('@nextblock-cms/utils/server', () => ({
  getS3PresignClient: mocks.getS3PresignClientMock,
}));

vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: class PutObjectCommand {
    constructor(public readonly input: unknown) {}
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mocks.getSignedUrlMock,
}));

import {
  buildR2UploadObjectKey,
  validateR2PresignedUploadPayload,
} from './custom-block-r2-upload';
import { POST } from '../app/api/media/r2-presigned/route';

describe('custom block R2 presigned upload flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.R2_BUCKET_NAME = 'nextblock-test';
    process.env.NEXT_PUBLIC_R2_BASE_URL = 'https://cdn.nextblock.test';
  });

  it('validates and sanitizes image upload keys', () => {
    const payload = validateR2PresignedUploadPayload({
      contentType: 'image/webp',
      filename: 'Hero Portrait!!!.webp',
      folder: '../custom blocks//testimonials',
      size: 1024,
    });

    expect(payload.folder).toBe('custom-blocks/testimonials/');
    expect(
      buildR2UploadObjectKey(payload, {
        nonce: 'abc123',
        now: new Date('2026-05-28T12:34:56.789Z'),
      })
    ).toBe('custom-blocks/testimonials/hero-portrait-20260528123456789-abc123.webp');
  });

  it('rejects anonymous users before creating an upload URL', async () => {
    mocks.getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    const response = await POST(
      new Request('https://nextblock.test/api/media/r2-presigned', {
        body: JSON.stringify({}),
        method: 'POST',
      }) as any
    );

    expect(response.status).toBe(401);
    expect(mocks.getS3PresignClientMock).not.toHaveBeenCalled();
  });

  it('rejects oversized files for authorized writers', async () => {
    mocks.getUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    mocks.profileSingleMock.mockResolvedValueOnce({ data: { role: 'WRITER' }, error: null });

    const response = await POST(
      new Request('https://nextblock.test/api/media/r2-presigned', {
        body: JSON.stringify({
          contentType: 'image/png',
          filename: 'too-large.png',
          size: 11 * 1024 * 1024,
        }),
        method: 'POST',
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('10 MB');
    expect(mocks.getS3PresignClientMock).not.toHaveBeenCalled();
  });

  it('returns a direct PUT upload space for authorized writers', async () => {
    mocks.getUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
    mocks.profileSingleMock.mockResolvedValueOnce({ data: { role: 'ADMIN' }, error: null });
    mocks.getS3PresignClientMock.mockResolvedValueOnce({ send: vi.fn() });
    mocks.getSignedUrlMock.mockResolvedValueOnce('https://r2.example.test/presigned-put');

    const response = await POST(
      new Request('https://nextblock.test/api/media/r2-presigned', {
        body: JSON.stringify({
          contentType: 'image/jpeg',
          filename: 'Customer Headshot.jpg',
          folder: 'custom-blocks/testimonials',
          size: 512_000,
        }),
        method: 'POST',
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      headers: { 'Content-Type': 'image/jpeg' },
      method: 'PUT',
      presignedUrl: 'https://r2.example.test/presigned-put',
      uploadUrl: 'https://r2.example.test/presigned-put',
    });
    expect(payload.objectKey).toMatch(
      /^custom-blocks\/testimonials\/customer-headshot-\d{17}-[a-f0-9-]+\.jpg$/
    );
    expect(payload.publicUrl).toContain('https://cdn.nextblock.test/custom-blocks/testimonials/');
  });
});
