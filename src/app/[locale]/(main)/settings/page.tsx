"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSettingsModal } from "@/hooks/use-settings-modal";

const SettingsPage = () => {
    const router = useRouter();
    const params = useParams();
    const { onOpen } = useSettingsModal();

    useEffect(() => {
        // Open settings modal
        onOpen();

        // Redirect to home
        router.replace(`/${params.locale}/documents`);
    }, [onOpen, router, params.locale]);

    return null;
};

export default SettingsPage;

