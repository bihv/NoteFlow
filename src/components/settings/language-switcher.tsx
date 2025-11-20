"use client";

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';
import { routing } from '@/i18n/routing';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function LanguageSwitcher() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const handleLanguageChange = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Label>{t('settings.appearance.language')}</Label>
                <p className="text-sm text-muted-foreground">
                    {t('settings.appearance.languageDescription')}
                </p>
            </div>
            <Select value={locale} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {routing.locales.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                            {t(`languages.${loc}`)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
