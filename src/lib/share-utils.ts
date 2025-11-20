import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export function generateShareUrl(): string {
    return nanoid();
}

export function isShareExpired(expiration: number | null | undefined): boolean {
    if (!expiration) return false;
    return Date.now() > expiration;
}

export type SharePermission = "view" | "comment" | "edit";

export function getSharePermissions(permission: SharePermission) {
    return {
        canView: true,
        canComment: permission === "comment" || permission === "edit",
        canEdit: permission === "edit",
    };
}

export function formatShareUrl(shareId: string): string {
    if (typeof window !== "undefined") {
        return `${window.location.origin}/s/${shareId}`;
    }
    return `/s/${shareId}`;
}
