const SERVER_ONLY_ERROR_MESSAGE = 'This module cannot be imported from a Client Component module. It should only be used from a Server Component.';
if (typeof window !== 'undefined') {
    throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}
// A placeholder implementation to break the circular dependency.
// The actual implementation needs to be found or recreated.
export const getTranslator = async (locale) => {
    console.log(`Fetching translations for locale: ${locale}`);
    // In a real app, you would fetch translations from a DB or a file
    const translations = {
        'cms_dashboard': 'CMS Dashboard (EN)',
        'greeting': 'Hello (EN)',
        'sign_out': 'Sign Out (EN)',
        'sign_in': 'Sign In (EN)',
        'sign_up': 'Sign Up (EN)',
        'update_env_file_warning': 'Warning: .env file needs update (EN)',
    };
    return (key) => {
        return translations[key] || key;
    };
};
//# sourceMappingURL=translations.js.map