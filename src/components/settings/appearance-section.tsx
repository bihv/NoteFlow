"use client";

import { useTranslations } from 'next-intl';
import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSwitcher } from "./language-switcher";

export function AppearanceSection() {
    const t = useTranslations();

    return (
        <div className="space-y-4 border rounded-lg p-6">
            <h2 className="text-xl font-semibold">{t('settings.appearance.title')}</h2>
            <ThemeSwitcher />
            <LanguageSwitcher />
        </div>
    );
}
