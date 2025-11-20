import { Avatar, AvatarImage } from "@/components/ui/avatar";
import type { UserResource } from "@clerk/types";

interface ProfileSectionProps {
    user: UserResource | null | undefined;
}

export function ProfileSection({ user }: ProfileSectionProps) {
    return (
        <div className="space-y-4 border rounded-lg p-6">
            <h2 className="text-xl font-semibold">Profile</h2>
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
        </div>
    );
}
