'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const locales = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
] as const;

export function LanguageSelector() {
    const t = useTranslations('language');
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();

    const setLocale = (newLocale: string) => {
        startTransition(() => {
            // Set cookie and reload to apply new locale
            document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
            window.location.reload();
        });
    };

    const currentLocale = locales.find((l) => l.code === locale) || locales[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={isPending}
                >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLocale.flag} {currentLocale.name}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {locales.map((loc) => (
                    <DropdownMenuItem
                        key={loc.code}
                        onClick={() => setLocale(loc.code)}
                        className={locale === loc.code ? 'bg-accent' : ''}
                    >
                        <span className="mr-2">{loc.flag}</span>
                        {loc.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
