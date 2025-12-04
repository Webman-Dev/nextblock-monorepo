import { S3Client } from "@aws-sdk/client-s3";
export declare function getS3Client(): Promise<S3Client | null>;
