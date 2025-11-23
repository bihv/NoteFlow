"use client";

import { useTranslations } from 'next-intl';
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { UserResource } from "@clerk/types";

interface ProfileSectionProps {
    user: UserResource | null | undefined;
}

export function ProfileSection({ user }: ProfileSectionProps) {
    const t = useTranslations();

    return (
        <div className="space-y-6 border rounded-lg p-6">
            <h2 className="text-xl font-semibold">{t('settings.account.title')}</h2>

            {/* Profile Info */}
            <div className="flex items-center gap-x-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.imageUrl} />
                </Avatar>
                <div className="space-y-1">
                    <p className="text-sm font-medium">{user?.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                        {user?.emailAddresses[0].emailAddress}
                    </p>
                </div>
            </div>

            <Separator />

            {/* Account Details */}
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
