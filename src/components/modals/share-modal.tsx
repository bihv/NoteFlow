"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Copy, Globe, Lock } from "lucide-react";
import { formatShareUrl } from "@/lib/share-utils";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: {
        _id: Id<"documents">;
        title: string;
        shareEnabled?: boolean;
        shareUrl?: string;
        sharePermission?: "view" | "comment" | "edit";
        shareExpiration?: number;
    };
}

type SharePermission = "view" | "comment" | "edit";
type ExpirationOption = "never" | "1day" | "7days" | "30days";

export function ShareModal({ isOpen, onClose, document }: ShareModalProps) {
    const [shareEnabled, setShareEnabled] = useState(document.shareEnabled || false);
    const [permission, setPermission] = useState<SharePermission>(
        document.sharePermission || "view"
    );
    const [expiration, setExpiration] = useState<ExpirationOption>("never");
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);

    const updateSharing = useMutation(api.documents.updateSharing);

    const getExpirationTimestamp = (option: ExpirationOption): number | undefined => {
        if (option === "never") return undefined;
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        switch (option) {
            case "1day": return now + day;
            case "7days": return now + 7 * day;
            case "30days": return now + 30 * day;
            default: return undefined;
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const shareUrl = await updateSharing({
                id: document._id,
                shareEnabled,
                sharePermission: shareEnabled ? permission : undefined,
                shareExpiration: shareEnabled ? getExpirationTimestamp(expiration) : undefined,
            });

            if (shareEnabled && shareUrl) {
                document.shareUrl = shareUrl;
            }

            toast.success(shareEnabled ? "Sharing enabled!" : "Sharing disabled");
        } catch (error) {
            console.error("Failed to update sharing:", error);
            toast.error("Failed to update sharing settings");
        } finally {
            setSaving(false);
        }
    };

    const handleCopyLink = async () => {
        if (!document.shareUrl) return;

        const url = formatShareUrl(document.shareUrl);
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied to clipboard!");

        setTimeout(() => setCopied(false), 2000);
    };

    const shareUrl = document.shareUrl ? formatShareUrl(document.shareUrl) : null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share "{document.title}"</DialogTitle>
                    <DialogDescription>
                        Share this document with others via a public link
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Enable Sharing Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label>Enable Sharing</Label>
                            <p className="text-sm text-muted-foreground">
                                Anyone with the link can access
                            </p>
                        </div>
                        <Switch
                            checked={shareEnabled}
                            onCheckedChange={setShareEnabled}
                        />
                    </div>

                    {shareEnabled && (
                        <>
                            {/* Permission Level */}
                            <div className="space-y-2">
                                <Label>Permission Level</Label>
                                <Select
                                    value={permission}
                                    onValueChange={(value) => setPermission(value as SharePermission)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="view">
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-4 w-4" />
                                                <span>View Only</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="comment">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                <span>Can Comment</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="edit">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                <span>Can Edit</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Expiration */}
                            <div className="space-y-2">
                                <Label>Link Expiration</Label>
                                <Select
                                    value={expiration}
                                    onValueChange={(value) => setExpiration(value as ExpirationOption)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="never">Never Expire</SelectItem>
                                        <SelectItem value="1day">1 Day</SelectItem>
                                        <SelectItem value="7days">7 Days</SelectItem>
                                        <SelectItem value="30days">30 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Share Link */}
                            {shareUrl && (
                                <div className="space-y-2">
                                    <Label>Share Link</Label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={shareUrl}
                                            readOnly
                                            className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCopyLink}
                                        >
                                            {copied ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
