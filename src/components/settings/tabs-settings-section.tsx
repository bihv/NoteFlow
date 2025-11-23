"use client";

import { useTranslations } from "next-intl";
import { useTabs } from "@/hooks/use-tabs";
import { usePreferences } from "@/hooks/use-preferences";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const MAX_TABS_OPTIONS = [
    { value: 5, label: "5 tabs" },
    { value: 10, label: "10 tabs" },
    { value: 15, label: "15 tabs" },
    { value: 20, label: "20 tabs" },
    { value: 25, label: "25 tabs" },
    { value: 30, label: "30 tabs" },
    { value: 40, label: "40 tabs" },
    { value: 50, label: "50 tabs" },
];

export function TabsSettingsSection() {
    const t = useTranslations();
    const { tabs } = useTabs();
    const { preferences, updatePreference } = usePreferences();
    const maxTabs = preferences.maxTabs;

    const currentTabsCount = tabs.length;
    const exceedsLimit = currentTabsCount > maxTabs;

    return (
        <div className="space-y-4 border rounded-lg p-6">
            <h2 className="text-xl font-semibold">{t('settings.tabs.title')}</h2>

            <div className="space-y-3">
                <div className="space-y-1">
                    <Label>{t('settings.tabs.maxTabs')}</Label>
                    <p className="text-sm text-muted-foreground">
                        {t('settings.tabs.maxTabsDescription')}
                    </p>
                </div>

                <Select
                    value={maxTabs.toString()}
                    onValueChange={(value) => updatePreference("maxTabs", parseInt(value))}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {MAX_TABS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="pt-2">
                    <p className="text-sm">
                        <span className="text-muted-foreground">
                            {t('settings.tabs.currentTabs')}:{" "}
                        </span>
                        <span className={exceedsLimit ? "text-destructive font-medium" : "font-medium"}>
                            {currentTabsCount} / {maxTabs}
                        </span>
                    </p>
                </div>

                {exceedsLimit && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {t('settings.tabs.warning', {
                                current: currentTabsCount,
                                max: maxTabs
                            })}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
