"use client";

import { ChevronsLeftRight } from "lucide-react";
import { useUser, SignOutButton } from "@clerk/nextjs";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const UserItem = () => {
    const { user } = useUser();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div
                    role="button"
                    className="flex items-center text-sm p-3 w-full hover:bg-accent/50 rounded-lg transition-all duration-200 group"
                >
                    <div className="gap-x-2 flex items-center max-w-[180px]">
                        <Avatar className="h-7 w-7 rounded-lg">
                            <AvatarImage src={user?.imageUrl} />
                        </Avatar>
                        <span className="text-start font-semibold line-clamp-1 text-sm">
                            {user?.fullName}
                        </span>
                    </div>
                    <ChevronsLeftRight className="rotate-90 ml-auto text-muted-foreground h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-60"
                align="start"
                alignOffset={11}
                forceMount
            >
                <div className="flex flex-col space-y-2 p-2">
                    <p className="text-xs font-medium leading-none text-muted-foreground">
                        {user?.emailAddresses[0].emailAddress}
                    </p>
                    <div className="flex items-center gap-x-2">
                        <div className="rounded-md bg-secondary p-1">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.imageUrl} />
                            </Avatar>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm line-clamp-1">
                                {user?.fullName}
                            </p>
                        </div>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="w-full cursor-pointer text-muted-foreground">
                    <SignOutButton>
                        Log out
                    </SignOutButton>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
