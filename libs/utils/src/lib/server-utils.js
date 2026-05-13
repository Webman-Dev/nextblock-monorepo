"use server";
/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export async function encodedRedirect(type, path, message) {
    const { redirect } = await import("next/navigation");
    return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}
export async function getEmailServerConfig() {
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
    const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME;
    if (!SMTP_HOST ||
        !SMTP_PORT ||
        !SMTP_USER ||
        !SMTP_PASS ||
        !SMTP_FROM_EMAIL) {
        console.warn('Email server environment variables are missing. Email will not be sent.');
        return null;
    }
    const from = SMTP_FROM_NAME
        ? `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`
        : SMTP_FROM_EMAIL;
    return {
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
        from,
    };
}
export async function hasEnvVars() {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
//# sourceMappingURL=server-utils.js.map