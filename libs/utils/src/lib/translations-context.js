"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from 'react';
const TranslationsContext = createContext(undefined);
export function TranslationsProvider({ children, translations, lang, }) {
    const processedTranslations = useMemo(() => {
        const result = {};
        for (const item of translations) {
            result[item.key] = item.translations;
        }
        return result;
    }, [translations]);
    const translate = (key, currentLang, params) => {
        const translationSet = processedTranslations[key];
        if (!translationSet) {
            return key; // Return key if not found
        }
        let text = translationSet[currentLang] || translationSet['en'] || key;
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(`{${paramKey}}`, String(value));
            });
        }
        return text;
    };
    const value = {
        translations: processedTranslations,
        t: (key, params) => translate(key, lang, params),
    };
    return (_jsx(TranslationsContext.Provider, { value: value, children: children }));
}
export function useTranslations() {
    const context = useContext(TranslationsContext);
    if (context === undefined) {
        throw new Error('useTranslations must be used within a TranslationsProvider');
    }
    return context;
}
//# sourceMappingURL=translations-context.js.map