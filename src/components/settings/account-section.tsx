"use client";

import { useTranslations } from 'next-intl';
import { Label } from "@/components/ui/label";
import type { UserResource } from "@clerk/types";

interface AccountSectionProps {
    user: UserResource | null | undefined;
}

export function AccountSection({ user }: AccountSectionProps) {
    const t = useTranslations();

    return (
        <div className="space-y-4 border rounded-lg p-6">
            <h2 className="text-xl font-semibold">{t('settings.account.title')}</h2>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label>User ID</Label>
                        <p className="text-sm text-muted-foreground font-mono">
                            {user?.id}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Label>Created</Label>
                        <p className="text-sm text-muted-foreground">
                            {user?.createdAt
                                ? user.createdAt.toLocaleDateString()
                                : "N/A"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
