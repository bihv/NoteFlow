"use client";

import { useState } from "react";

export const useSettingsModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    return {
        isOpen,
        onOpen: () => setIsOpen(true),
        onClose: () => setIsOpen(false),
    };
};
