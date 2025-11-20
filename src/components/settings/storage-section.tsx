"use client";

import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface CloudinaryStats {
    plan: string;
    credits: {
        used: number;
        limit: number;
        percentage: string;
        remaining: string;
    };
    storage: {
        usedBytes: number;
        usedMB: string;
        credits: number;
        maxSizeBytes: number;
        maxSizeMB: string;
    };
    bandwidth: {
        usedBytes: number;
        usedMB: string;
        usedGB: string;
        credits: number;
    };
    transformations: {
        used: number;
        credits: number;
    };
    resources: {
        total: number;
        derived: number;
    };
    rateLimit: {
        allowed: number;
        remaining: number;
        resetAt: string | null;
    };
}

export function StorageSection() {
    const t = useTranslations();
    const [stats, setStats] = useState<CloudinaryStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch("/api/cloudinary/stats");
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch Cloudinary stats:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 border rounded-lg p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t('settings.storage.title')}</h2>
                {stats && (
                    <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                        {stats.plan} Plan
                    </span>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{t('settings.storage.loading')}</p>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ) : stats ? (
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Credits Usage</span>
                            <span className="text-muted-foreground">
                                {stats.credits.used} / {stats.credits.limit} credits
                            </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2.5">
                            <div
                                className="bg-primary h-2.5 rounded-full transition-all"
                                style={{ width: `${stats.credits.percentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.credits.percentage}% used • {stats.credits.remaining} credits remaining
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 p-3 border rounded-lg">
                            <Label className="text-xs text-muted-foreground">Storage</Label>
                            <p className="text-lg font-semibold">{stats.storage.usedMB} MB</p>
                            <p className="text-xs text-muted-foreground">
                                {stats.storage.credits} credits • Max {stats.storage.maxSizeMB} MB/file
                            </p>
                        </div>

                        <div className="space-y-1 p-3 border rounded-lg">
                            <Label className="text-xs text-muted-foreground">Bandwidth</Label>
                            <p className="text-lg font-semibold">
                                {parseFloat(stats.bandwidth.usedGB) > 0
                                    ? `${stats.bandwidth.usedGB} GB`
                                    : `${stats.bandwidth.usedMB} MB`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {stats.bandwidth.credits} credits
                            </p>
                        </div>

                        <div className="space-y-1 p-3 border rounded-lg">
                            <Label className="text-xs text-muted-foreground">Transformations</Label>
                            <p className="text-lg font-semibold">{stats.transformations.used}</p>
                            <p className="text-xs text-muted-foreground">
                                {stats.transformations.credits} credits
                            </p>
                        </div>

                        <div className="space-y-1 p-3 border rounded-lg">
                            <Label className="text-xs text-muted-foreground">Resources</Label>
                            <p className="text-lg font-semibold">{stats.resources.total} files</p>
                            <p className="text-xs text-muted-foreground">
                                {stats.resources.derived} derived
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                            <Label className="text-xs">API Rate Limit</Label>
                            <p className="text-sm text-muted-foreground">
                                {stats.rateLimit.remaining} / {stats.rateLimit.allowed} requests remaining
                            </p>
                            {stats.rateLimit.resetAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Resets: {(() => {
                                        const date = new Date(stats.rateLimit.resetAt);
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const year = date.getFullYear();
                                        const hours = String(date.getHours()).padStart(2, '0');
                                        const minutes = String(date.getMinutes()).padStart(2, '0');
                                        const seconds = String(date.getSeconds()).padStart(2, '0');
                                        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
                                    })()}
                                </p>
                            )}
                        </div>
                        <Button onClick={fetchStats} variant="outline" size="sm">
                            Refresh
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Failed to load storage statistics
                </p>
            )}
        </div>
    );
}
