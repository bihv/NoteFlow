"use client";

import { useUser } from "@clerk/nextjs";
import { useTranslations } from 'next-intl';
import { StorageSection } from "@/components/settings/storage-section";
import { DataExportSection } from "@/components/settings/data-export-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { TabsSettingsSection } from "@/components/settings/tabs-settings-section";
import { AccountSection } from "@/components/settings/account-section";

const SettingsPage = () => {
    const { user } = useUser();
    const t = useTranslations();

    return (
        <div className="h-full flex flex-col items-center justify-center space-y-4 p-8">
            <div className="w-full max-w-2xl space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('settings.description')}
                    </p>
                </div>

                <StorageSection />

                <DataExportSection />

                <ProfileSection user={user} />

                <AppearanceSection />

                <TabsSettingsSection />

                <AccountSection user={user} />
            </div>
        </div>
    );
};

export default SettingsPage;
