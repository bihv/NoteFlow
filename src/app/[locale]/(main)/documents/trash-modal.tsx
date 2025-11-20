"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
} from "@/components/ui/dialog";
import { TrashBox } from "../_components/trash-box";

export const useTrashModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    return {
        isOpen,
        onOpen: () => setIsOpen(true),
        onClose: () => setIsOpen(false),
    };
};

interface TrashModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TrashModal = ({ isOpen, onClose }: TrashModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <h2 className="text-center text-lg font-medium">Trash</h2>
                </DialogHeader>
                <div>
                    <TrashBox />
                </div>
            </DialogContent>
        </Dialog>
    );
};
