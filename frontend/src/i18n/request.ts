import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['en', 'pl'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async () => {
    // Try to get locale from cookie first
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('locale')?.value as Locale | undefined;

    if (localeCookie && locales.includes(localeCookie)) {
        return {
            locale: localeCookie,
            messages: (await import(`../../messages/${localeCookie}.json`)).default,
        };
    }

    // Fall back to Accept-Language header
    const headerStore = await headers();
    const acceptLanguage = headerStore.get('accept-language') || '';

    // Parse Accept-Language header to find best match
    const browserLocales = acceptLanguage
        .split(',')
        .map((lang) => lang.split(';')[0].trim().substring(0, 2).toLowerCase());

    const matchedLocale = browserLocales.find((lang) =>
        locales.includes(lang as Locale)
    ) as Locale | undefined;

    const locale = matchedLocale || defaultLocale;

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
