"use client";

import { useTranslations } from 'next-intl';
import { useTheme } from "next-themes";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

const themes = [
    { value: "light", labelKey: "settings.appearance.themes.light" },
    { value: "dark", labelKey: "settings.appearance.themes.dark" },
    { value: "system", labelKey: "settings.appearance.themes.system" },
];

export function ThemeSwitcher() {
    const t = useTranslations();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <Label>{t('settings.appearance.theme')}</Label>
                <p className="text-sm text-muted-foreground">
                    {t('settings.appearance.themeDescription')}
                </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {themes.map((themeOption) => (
                        <SelectItem key={themeOption.value} value={themeOption.value}>
                            {t(themeOption.labelKey)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
