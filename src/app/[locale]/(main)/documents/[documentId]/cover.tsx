"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImageIcon, X } from "lucide-react";
import { useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface CoverProps {
    url?: string;
    preview?: boolean;
}

export const Cover = ({ url, preview }: CoverProps) => {
    const params = useParams();
    const removeCoverImage = useMutation(api.documents.update);

    const onRemove = async () => {
        if (url) {
            // Delete from Cloudinary first
            try {
                await fetch(`/api/upload/delete?url=${encodeURIComponent(url)}`, {
                    method: "DELETE",
                });
            } catch (error) {
                console.error("Error deleting from Cloudinary:", error);
            }

            // Then remove from document
            removeCoverImage({
                id: params.documentId as Id<"documents">,
                coverImage: "",
            });
        }
    };

    return (
        <div
            className={cn(
                "relative w-full h-[35vh] group",
                !url && "h-[12vh]",
                url && "bg-muted"
            )}
        >
            {!!url && <Image src={url} fill alt="Cover" className="object-cover" />}
            {url && !preview && (
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-5 right-5 flex items-center gap-x-2">
                    <Button
                        onClick={onRemove}
                        className="text-muted-foreground text-xs"
                        variant="outline"
                        size="sm"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Remove cover
                    </Button>
                </div>
            )}
        </div>
    );
};

Cover.Skeleton = function CoverSkeleton() {
    return <Skeleton className="w-full h-[12vh]" />;
};
