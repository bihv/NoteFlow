"use client";

import { useState } from "react";
import { SettingsNavigation, SettingsSection } from "./settings-navigation";

interface SettingsLayoutProps {
    sections: {
        [key in SettingsSection]: React.ReactNode;
    };
}

export function SettingsLayout({ sections }: SettingsLayoutProps) {
    const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

    return (
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full">
            <SettingsNavigation
                activeSection={activeSection}
                onSectionChange={setActiveSection}
            />
            <div className="flex-1 min-w-0">
                {sections[activeSection]}
            </div>
        </div>
    );
}
