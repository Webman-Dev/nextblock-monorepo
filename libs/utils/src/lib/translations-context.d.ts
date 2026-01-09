import React from 'react';
type Translations = {
    [key: string]: {
        [lang: string]: string;
    };
};
type TranslationsContextType = {
    translations: Translations;
    t: (key: string, params?: Record<string, string | number>) => string;
};
export declare function TranslationsProvider({ children, translations, lang, }: {
    children: React.ReactNode;
    translations: {
        key: string;
        translations: {
            [lang: string]: string;
        };
    }[];
    lang: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function useTranslations(): TranslationsContextType;
export {};
