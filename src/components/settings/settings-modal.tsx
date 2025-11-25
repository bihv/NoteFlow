"use client";

import { useUser } from "@clerk/nextjs";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { StorageSection } from "@/components/settings/storage-section";
import { DataExportSection } from "@/components/settings/data-export-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { TabsSettingsSection } from "@/components/settings/tabs-settings-section";
import { AISettingsSection } from "@/components/settings/ai-settings-section";
import { HistorySettingsSection } from "@/components/settings/history-settings-section";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { user } = useUser();

    const sections = {
        profile: <ProfileSection user={user} />,
        appearance: <AppearanceSection />,
        tabs: <TabsSettingsSection />,
        ai: <AISettingsSection />,
        history: <HistorySettingsSection />,
        storage: <StorageSection />,
        "data-export": <DataExportSection />,
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={cn(
                    "max-w-4xl h-[90vh] p-6 gap-0 flex flex-col",
                    "max-h-[90vh] overflow-hidden"
                )}
            >
                {/* Content - X button is auto-rendered by DialogContent */}
                <div className="flex-1 overflow-y-auto -mx-6 px-6 pt-8">
                    <SettingsLayout sections={sections} />
                </div>
            </DialogContent>
        </Dialog>
    );
};
