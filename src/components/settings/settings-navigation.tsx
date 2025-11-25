"use client";

import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import {
    User,
    Palette,
    LayoutGrid,
    History,
    Database,
    FileDown,
    Sparkles
} from "lucide-react";

export type SettingsSection =
    | "profile"
    | "appearance"
    | "tabs"
    | "ai"
    | "history"
    | "storage"
    | "data-export";

interface SettingsNavigationProps {
    activeSection: SettingsSection;
    onSectionChange: (section: SettingsSection) => void;
}

interface NavItem {
    id: SettingsSection;
    icon: React.ReactNode;
    labelKey: string;
    group: "account" | "customization" | "data";
}

export function SettingsNavigation({
    activeSection,
    onSectionChange
}: SettingsNavigationProps) {
    const t = useTranslations();

    const navItems: NavItem[] = [
        // Account Group
        {
            id: "profile",
            icon: <User className="w-4 h-4" />,
            labelKey: "settings.profile.title",
            group: "account"
        },

        // Customization Group
        {
            id: "appearance",
            icon: <Palette className="w-4 h-4" />,
            labelKey: "settings.appearance.title",
            group: "customization"
        },
        {
            id: "tabs",
            icon: <LayoutGrid className="w-4 h-4" />,
            labelKey: "settings.tabs.title",
            group: "customization"
        },
        {
            id: "ai",
            icon: <Sparkles className="w-4 h-4" />,
            labelKey: "settings.ai.title",
            group: "customization"
        },
        {
            id: "history",
            icon: <History className="w-4 h-4" />,
            labelKey: "settings.history.title",
            group: "customization"
        },

        // Data Group
        {
            id: "storage",
            icon: <Database className="w-4 h-4" />,
            labelKey: "settings.storage.title",
            group: "data"
        },
        {
            id: "data-export",
            icon: <FileDown className="w-4 h-4" />,
            labelKey: "settings.dataExport.title",
            group: "data"
        },
    ];

    const groupLabels = {
        account: t('settings.nav.account'),
        customization: t('settings.nav.customization'),
        data: t('settings.nav.data'),
    };

    const groupedItems = {
        account: navItems.filter(item => item.group === 'account'),
        customization: navItems.filter(item => item.group === 'customization'),
        data: navItems.filter(item => item.group === 'data'),
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden md:block w-64 pr-8 space-y-6">
                {(Object.keys(groupedItems) as Array<keyof typeof groupedItems>).map((group) => (
                    <div key={group}>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            {groupLabels[group]}
                        </h3>
                        <div className="space-y-1">
                            {groupedItems[group].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSectionChange(item.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        activeSection === item.id
                                            ? "bg-accent text-accent-foreground font-medium"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {item.icon}
                                    <span>{t(item.labelKey)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Mobile Select Dropdown */}
            <div className="md:hidden mb-6">
                <select
                    value={activeSection}
                    onChange={(e) => onSectionChange(e.target.value as SettingsSection)}
                    className={cn(
                        "w-full px-4 py-3 rounded-lg border bg-background",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                        "text-sm font-medium"
                    )}
                >
                    {(Object.keys(groupedItems) as Array<keyof typeof groupedItems>).map((group) => (
                        <optgroup key={group} label={groupLabels[group]}>
                            {groupedItems[group].map((item) => (
                                <option key={item.id} value={item.id}>
                                    {t(item.labelKey)}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>
        </>
    );
}
