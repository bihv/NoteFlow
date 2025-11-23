"use client";

import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

export const UserItem = () => {
    const { user } = useUser();

    return (
        <div className="flex items-center text-sm p-3 w-full rounded-lg">
            <div className="gap-x-2 flex items-center max-w-[180px]">
                <Avatar className="h-7 w-7 rounded-full">
                    <AvatarImage src={user?.imageUrl} />
                </Avatar>
                <span className="text-start font-semibold line-clamp-1 text-sm">
                    {user?.fullName}
                </span>
            </div>
        </div>
    );
};
