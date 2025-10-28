declare module '@nextblock-cms/utils' {
  import type { ClassValue } from 'clsx';
  import type React from 'react';

  export const hasPublicEnvVars: string | undefined;
  export function cn(...inputs: ClassValue[]): string;

  export type Translations = Record<string, Record<string, string>>;

  export type TranslationsContextType = {
    translations: Translations;
    t: (key: string, params?: Record<string, string | number>) => string;
  };

  export function TranslationsProvider(props: {
    children: React.ReactNode;
    translations: { key: string; translations: Record<string, string> }[];
    lang: string;
  }): React.ReactElement;

  export function useTranslations(): TranslationsContextType;
}

declare module '@nextblock-cms/utils/server' {
  import type { S3Client } from '@aws-sdk/client-s3';

  export function getS3Client(): Promise<S3Client | null>;
  export function encodedRedirect(
    type: 'error' | 'success',
    path: string,
    message: string
  ): Promise<never>;
  export function getEmailServerConfig(): Promise<{
    host: string;
    port: number;
    auth: {
      user: string;
      pass: string;
    };
    from: string;
  } | null>;
  export function hasEnvVars(): Promise<boolean>;
}
