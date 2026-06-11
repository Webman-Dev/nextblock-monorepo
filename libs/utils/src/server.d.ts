import { S3Client } from "@aws-sdk/client-s3";
export { encodedRedirect, getEmailServerConfig, hasEnvVars, } from './lib/server-utils';
export declare function getS3Client(): Promise<S3Client | null>;
export declare function getS3PresignClient(): Promise<S3Client | null>;
export declare function deleteMediaFiles(keys: string[]): Promise<void>;
