"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import { type EditorProps } from "@/components/editor";

export const Editor = ({ ...props }: EditorProps) => {
    const EditorComponent = useMemo(
        () => dynamic(() => import("@/components/editor"), { ssr: false }),
        []
    );

    return <EditorComponent {...props} />;
};
