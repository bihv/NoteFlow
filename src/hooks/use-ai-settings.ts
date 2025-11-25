"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";

export function useAISettings() {
    const preferences = useQuery(api.userPreferences.getUserPreferences);
    const updatePreferences = useMutation(api.userPreferences.updateUserPreferences);
    const [isUpdating, setIsUpdating] = useState(false);

    const settings = {
        aiModel: preferences?.aiModel ?? "flash",
        aiTemperature: preferences?.aiTemperature ?? 0.7,
        aiGenerationMode: preferences?.aiGenerationMode ?? "normal",
        aiMaxContinuations: preferences?.aiMaxContinuations ?? 5,
        aiTimeoutMs: preferences?.aiTimeoutMs ?? 300000,
    };

    const updateSetting = useCallback(
        async (key: string, value: any) => {
            setIsUpdating(true);
            try {
                await updatePreferences({ [key]: value });
            } catch (error) {
                console.error("Failed to update AI setting:", error);
                throw error;
            } finally {
                setIsUpdating(false);
            }
        },
        [updatePreferences]
    );

    return {
        settings,
        updateSetting,
        isLoading: preferences === undefined,
        isUpdating,
    };
}
