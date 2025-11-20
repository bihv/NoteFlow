"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTabs, updateMaxTabsSetting } from "@/hooks/use-tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const MIN_TABS = 5;
const MAX_TABS_LIMIT = 50;

export function TabsSettingsSection() {
    const t = useTranslations();
    const { tabs, maxTabs } = useTabs();
    const [localMaxTabs, setLocalMaxTabs] = useState(maxTabs);

    // Sync local state with hook state
    useEffect(() => {
        setLocalMaxTabs(maxTabs);
    }, [maxTabs]);

    const handleMaxTabsChange = (value: number[]) => {
        const newMax = value[0];
        setLocalMaxTabs(newMax);
        updateMaxTabsSetting(newMax);
    };

    const currentTabsCount = tabs.length;
    const exceedsLimit = currentTabsCount > localMaxTabs;

    return (
        <div className="space-y-4 border rounded-lg p-6">
            <h2 className="text-xl font-semibold">{t('settings.tabs.title')}</h2>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>{t('settings.tabs.maxTabs')}</Label>
                    <span className="text-sm font-medium text-muted-foreground">
                        {localMaxTabs} tabs
                    </span>
                </div>

                <p className="text-sm text-muted-foreground">
                    {t('settings.tabs.maxTabsDescription')}
                </p>

                <Slider
                    value={[localMaxTabs]}
                    onValueChange={handleMaxTabsChange}
                    min={MIN_TABS}
                    max={MAX_TABS_LIMIT}
                    step={1}
                    className="w-full"
                />

                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{MIN_TABS}</span>
                    <span>{MAX_TABS_LIMIT}</span>
                </div>

                <div className="pt-2">
                    <p className="text-sm">
                        <span className="text-muted-foreground">
                            {t('settings.tabs.currentTabs')}:{" "}
                        </span>
                        <span className={exceedsLimit ? "text-destructive font-medium" : "font-medium"}>
                            {currentTabsCount} / {localMaxTabs}
                        </span>
                    </p>
                </div>

                {exceedsLimit && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {t('settings.tabs.warning', {
                                current: currentTabsCount,
                                max: localMaxTabs
                            })}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
