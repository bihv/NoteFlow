"use client";

import { useTranslations } from "next-intl";
import { useHistorySettings, formatDebounceTime } from "@/hooks/use-history-settings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Clock, Database, Trash2, Bell } from "lucide-react";

const DEBOUNCE_OPTIONS = [
    { value: 30000, label: "30 seconds" },
    { value: 60000, label: "1 minute" },
    { value: 120000, label: "2 minutes" },
    { value: 300000, label: "5 minutes" },
    { value: 600000, label: "10 minutes" },
];

const MAX_VERSIONS_OPTIONS = [
    { value: 10, label: "10 versions" },
    { value: 20, label: "20 versions" },
    { value: 30, label: "30 versions" },
    { value: 50, label: "50 versions" },
    { value: 75, label: "75 versions" },
    { value: 100, label: "100 versions" },
];

const RETENTION_OPTIONS = [
    { value: 7, label: "1 week (7 days)" },
    { value: 14, label: "2 weeks (14 days)" },
    { value: 30, label: "1 month (30 days)" },
    { value: 60, label: "2 months (60 days)" },
    { value: 90, label: "3 months (90 days)" },
    { value: 180, label: "6 months (180 days)" },
    { value: 365, label: "1 year (365 days)" },
];

export function HistorySettingsSection() {
    const t = useTranslations();
    const { settings, updateSetting, isLoading } = useHistorySettings();

    if (isLoading) {
        return (
            <div className="space-y-4 border rounded-lg p-6">
                <Skeleton className="h-7 w-48" />
                <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 border rounded-lg p-6">
            <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t("settings.history.title")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure how document versions are saved and managed
                </p>
            </div>

            {/* Enable Auto-Versioning */}
            <div className="space-y-3 pb-4 border-b">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label className="text-base">
                            {t("settings.history.enableAutoVersioning")}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {t("settings.history.enableAutoVersioningDescription")}
                        </p>
                    </div>
                    <Switch
                        checked={settings.historyEnabled}
                        onCheckedChange={(checked) =>
                            updateSetting("historyEnabled", checked)
                        }
                    />
                </div>
                {!settings.historyEnabled && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Auto-versioning is disabled. New versions will not be created automatically.
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Debounce Time */}
            <div className="space-y-3 pb-4 border-b">
                <div className="space-y-1">
                    <Label className="text-base">
                        {t("settings.history.debounceTime")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.history.debounceTimeDescription")}
                    </p>
                </div>
                <Select
                    value={settings.historyDebounceMs.toString()}
                    onValueChange={(value) =>
                        updateSetting("historyDebounceMs", parseInt(value))
                    }
                    disabled={!settings.historyEnabled}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DEBOUNCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Max Versions */}
            <div className="space-y-3 pb-4 border-b">
                <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        {t("settings.history.maxVersions")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.history.maxVersionsDescription")}
                    </p>
                </div>
                <Select
                    value={settings.historyMaxVersions.toString()}
                    onValueChange={(value) =>
                        updateSetting("historyMaxVersions", parseInt(value))
                    }
                    disabled={!settings.historyEnabled}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {MAX_VERSIONS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Retention Days */}
            <div className="space-y-3 pb-4 border-b">
                <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        {t("settings.history.retentionDays")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.history.retentionDaysDescription")}
                    </p>
                </div>
                <Select
                    value={settings.historyRetentionDays.toString()}
                    onValueChange={(value) =>
                        updateSetting("historyRetentionDays", parseInt(value))
                    }
                    disabled={!settings.historyEnabled}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {RETENTION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Show Notifications */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label className="text-base flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            {t("settings.history.showNotifications")}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {t("settings.history.showNotificationsDescription")}
                        </p>
                    </div>
                    <Switch
                        checked={settings.historyShowNotifications}
                        onCheckedChange={(checked) =>
                            updateSetting("historyShowNotifications", checked)
                        }
                        disabled={!settings.historyEnabled}
                    />
                </div>
            </div>
        </div>
    );
}

