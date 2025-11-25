"use client";

import { useTranslations } from "next-intl";
import { useAISettings } from "@/hooks/use-ai-settings";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Zap, Brain, Clock } from "lucide-react";

const TEMPERATURE_OPTIONS = [
    { value: 0.0, label: "0.0 - Most Precise" },
    { value: 0.1, label: "0.1" },
    { value: 0.2, label: "0.2" },
    { value: 0.3, label: "0.3" },
    { value: 0.4, label: "0.4" },
    { value: 0.5, label: "0.5 - Balanced" },
    { value: 0.6, label: "0.6" },
    { value: 0.7, label: "0.7 - Recommended" },
    { value: 0.8, label: "0.8" },
    { value: 0.9, label: "0.9" },
    { value: 1.0, label: "1.0 - Most Creative" },
];

const TIMEOUT_OPTIONS = [
    { value: 60000, label: "1 minute" },
    { value: 180000, label: "3 minutes" },
    { value: 300000, label: "5 minutes" },
    { value: 600000, label: "10 minutes" },
    { value: 900000, label: "15 minutes" },
];

const MAX_CONTINUATIONS_OPTIONS = [
    { value: 1, label: "1 continuation" },
    { value: 3, label: "3 continuations" },
    { value: 5, label: "5 continuations" },
    { value: 7, label: "7 continuations" },
    { value: 10, label: "10 continuations" },
];

export function AISettingsSection() {
    const t = useTranslations();
    const { settings, updateSetting, isLoading } = useAISettings();

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
                    <Sparkles className="h-5 w-5" />
                    {t("settings.ai.title")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {t("settings.ai.description")}
                </p>
            </div>

            {/* AI Model Selection */}
            <div className="space-y-3 pb-4 border-b">
                <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        {t("settings.ai.model")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.ai.modelDescription")}
                    </p>
                </div>
                <RadioGroup
                    value={settings.aiModel}
                    onValueChange={(value) => updateSetting("aiModel", value)}
                    className="space-y-2"
                >
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="flash" id="flash" />
                        <Label htmlFor="flash" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                <span className="font-medium">{t("settings.ai.modelFlash")}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("settings.ai.modelFlashDescription")}
                            </p>
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="pro" id="pro" />
                        <Label htmlFor="pro" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-purple-500" />
                                <span className="font-medium">{t("settings.ai.modelPro")}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("settings.ai.modelProDescription")}
                            </p>
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Temperature Dropdown */}
            <div className="space-y-3 pb-4 border-b">
                <div className="space-y-1">
                    <Label className="text-base">
                        {t("settings.ai.temperature")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.ai.temperatureDescription")}
                    </p>
                </div>
                <Select
                    value={(settings.aiTemperature ?? 0.7).toString()}
                    onValueChange={(value) =>
                        updateSetting("aiTemperature", parseFloat(value))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select temperature" />
                    </SelectTrigger>
                    <SelectContent>
                        {TEMPERATURE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Generation Mode */}
            <div className="space-y-3 pb-4 border-b">
                <div className="space-y-1">
                    <Label className="text-base">
                        {t("settings.ai.generationMode")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.ai.generationModeDescription")}
                    </p>
                </div>
                <RadioGroup
                    value={settings.aiGenerationMode}
                    onValueChange={(value) => updateSetting("aiGenerationMode", value)}
                    className="space-y-2"
                >
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="normal" id="normal" />
                        <Label htmlFor="normal" className="flex-1 cursor-pointer">
                            <span className="font-medium">{t("settings.ai.generationModeNormal")}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("settings.ai.generationModeNormalDescription")}
                            </p>
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="chunks" id="chunks" />
                        <Label htmlFor="chunks" className="flex-1 cursor-pointer">
                            <span className="font-medium">{t("settings.ai.generationModeChunks")}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("settings.ai.generationModeChunksDescription")}
                            </p>
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Max Continuations */}
            <div className="space-y-3 pb-4 border-b">
                <div className="space-y-1">
                    <Label className="text-base">
                        {t("settings.ai.maxContinuations")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.ai.maxContinuationsDescription")}
                    </p>
                </div>
                <Select
                    value={settings.aiMaxContinuations.toString()}
                    onValueChange={(value) =>
                        updateSetting("aiMaxContinuations", parseInt(value))
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {MAX_CONTINUATIONS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Timeout */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t("settings.ai.timeout")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t("settings.ai.timeoutDescription")}
                    </p>
                </div>
                <Select
                    value={settings.aiTimeoutMs.toString()}
                    onValueChange={(value) =>
                        updateSetting("aiTimeoutMs", parseInt(value))
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TIMEOUT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
