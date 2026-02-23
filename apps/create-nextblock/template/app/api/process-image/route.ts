// app/api/process-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getS3Client } from '@nextblock-cms/utils/server';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { Readable } from 'stream';
import { getPlaiceholder } from 'plaiceholder';

// Helper to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk as Buffer));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
// Construct the public URL base. Assumes your R2 bucket is set up for public access.
// Example: https://<your-bucket>.<account-id>.r2.cloudflarestorage.com
// Or if you use a custom domain: https://your.custom.domain
const R2_PUBLIC_URL_BASE = process.env.NEXT_PUBLIC_R2_BASE_URL;

interface ProcessedImageVariant {
  objectKey: string;
  url: string;
  width: number;
  height: number;
  fileType: string; // e.g., 'image/avif'
  sizeBytes: number;
  variantLabel: string; // e.g., 'large_avif', 'medium_avif', 'thumbnail_avif', 'original_avif'
}

// Define target sizes (widths) and the AVIF format
const TARGET_SIZES = [
  { width: 1920, label: 'xlarge_avif' },
  { width: 1280, label: 'large_avif' },
  { width: 768, label: 'medium_avif' },
  { width: 384, label: 'small_avif' },
  { width: 128, label: 'thumbnail_avif' }, // For very small previews or blur placeholders
];
const TARGET_FORMAT = 'avif';
const TARGET_MIME_TYPE = 'image/avif';

export async function POST(request: NextRequest) {
  if (!R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'R2 bucket name is not configured.' }, { status: 500 });
  }
  if (!process.env.R2_S3_ENDPOINT && !process.env.R2_ACCOUNT_ID) {
    console.error("R2_S3_ENDPOINT or R2_ACCOUNT_ID must be set to construct R2_PUBLIC_URL_BASE");
    return NextResponse.json({ error: 'Server configuration error for R2 public URL.' }, { status: 500 });
  }


  try {
    const s3Client = await getS3Client();
    if (!s3Client) {
      console.error('R2 client is not configured. Check your R2 environment variables.');
      return NextResponse.json({ error: 'Image processing is not configured on this server.' }, { status: 500 });
    }

    const { objectKey: originalObjectKey, contentType: originalContentType } = await request.json();

    if (!originalObjectKey || !originalContentType) {
      return NextResponse.json({ error: 'Missing objectKey or contentType in request body.' }, { status: 400 });
    }

    if (!originalContentType.startsWith('image/')) {
      // For now, we only process images. Could be extended for other file types if needed.
      return NextResponse.json({
        message: 'File is not an image. Skipping processing.',
        originalImage: { objectKey: originalObjectKey, fileType: originalContentType, url: `${R2_PUBLIC_URL_BASE}/${originalObjectKey}` },
        processedVariants: [],
        blurDataURL: null // Or an empty string, depending on how you want to handle non-images
      }, { status: 200 });
    }

    // 1. Fetch the original image from R2
    const getObjectParams = {
      Bucket: R2_BUCKET_NAME,
      Key: originalObjectKey,
    };
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const getObjectResponse = await s3Client.send(getObjectCommand);

    if (!getObjectResponse.Body) {
      throw new Error('Failed to retrieve image from R2: Empty body.');
    }

    let imageBuffer = await streamToBuffer(getObjectResponse.Body as Readable);
    let sharpInstance = sharp(imageBuffer);
    let originalMetadata = await sharpInstance.metadata();

    const MAX_WIDTH = 2560; // Define max width

    // Check if the image width is greater than MAX_WIDTH
    if (originalMetadata.width && originalMetadata.width > MAX_WIDTH) {
      // Resize the image
      const resizedBuffer = await sharpInstance
        .resize({
          width: MAX_WIDTH,
          // height is scaled automatically to maintain aspect ratio
        })
        .toBuffer();
      
      // Update buffer and sharp instance for all subsequent operations
      imageBuffer = resizedBuffer;
      sharpInstance = sharp(imageBuffer);
      // Update metadata as well
      originalMetadata = await sharpInstance.metadata();
    }

    const processedVariants: ProcessedImageVariant[] = [];
    const baseName = originalObjectKey.substring(0, originalObjectKey.lastIndexOf('.'));
    // const originalExtension = originalObjectKey.substring(originalObjectKey.lastIndexOf('.') + 1);

    // 2. Process and upload variants (resized AVIF)
    for (const size of TARGET_SIZES) {
      if (!originalMetadata.width) continue; // Skip if original width is unknown

      const targetWidth = Math.min(size.width, originalMetadata.width); // Don't upscale beyond original
      
      const processedImageBuffer = await sharpInstance
        .clone() // Important: clone before each new operation
        .resize({ width: targetWidth, withoutEnlargement: true })
        .toFormat(TARGET_FORMAT, { quality: 75 }) // Adjust quality as needed
        .toBuffer();
      
      const newObjectKey = `${baseName}_${size.label}.${TARGET_FORMAT}`;
      const newPublicUrl = `${R2_PUBLIC_URL_BASE}/${newObjectKey}`;

      const putObjectParams = {
        Bucket: R2_BUCKET_NAME,
        Key: newObjectKey,
        Body: processedImageBuffer,
        ContentType: TARGET_MIME_TYPE,
      };
      await s3Client.send(new PutObjectCommand(putObjectParams));

      const newMetadata = await sharp(processedImageBuffer).metadata();
      processedVariants.push({
        objectKey: newObjectKey,
        url: newPublicUrl,
        width: newMetadata.width || targetWidth,
        height: newMetadata.height || 0, // Sharp should provide this
        fileType: TARGET_MIME_TYPE,
        sizeBytes: processedImageBuffer.length,
        variantLabel: size.label,
      });
    }

    // 3. Optionally, convert the original image to AVIF if it's not already (and keep original size)
    // This gives an AVIF version of the original uploaded image.
    if (originalContentType !== TARGET_MIME_TYPE) {
        const originalAvifBuffer = await sharp(imageBuffer)
            .clone()
            .toFormat(TARGET_FORMAT, { quality: 80 }) // Potentially higher quality for "original" AVIF
            .toBuffer();
        
        const originalAvifObjectKey = `${baseName}_original.${TARGET_FORMAT}`;
        const originalAvifPublicUrl = `${R2_PUBLIC_URL_BASE}/${originalAvifObjectKey}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: originalAvifObjectKey,
            Body: originalAvifBuffer,
            ContentType: TARGET_MIME_TYPE,
        }));
        const originalAvifMetadata = await sharp(originalAvifBuffer).metadata();
        processedVariants.push({
            objectKey: originalAvifObjectKey,
            url: originalAvifPublicUrl,
            width: originalAvifMetadata.width || originalMetadata.width || 0,
            height: originalAvifMetadata.height || originalMetadata.height || 0,
            fileType: TARGET_MIME_TYPE,
            sizeBytes: originalAvifBuffer.length,
            variantLabel: 'original_avif',
        });
    }


    // Include original image details (even if not AVIF) for reference in the database
    // The client already has some of this, but good to have a consistent structure.
    const originalImageDetails: ProcessedImageVariant = {
        objectKey: originalObjectKey,
        url: `${R2_PUBLIC_URL_BASE}/${originalObjectKey}`,
        width: originalMetadata.width || 0,
        height: originalMetadata.height || 0,
        fileType: originalContentType,
        sizeBytes: imageBuffer.length,
        variantLabel: 'original_uploaded',
    };

    // Generate blurDataURL
    const { base64: blurDataURL } = await getPlaiceholder(imageBuffer, { size: 10 });
 
    return NextResponse.json({
        message: 'Image processed successfully.',
        originalImage: originalImageDetails,
        processedVariants,
        blurDataURL
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error processing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process image.', details: errorMessage }, { status: 500 });
  }
}
