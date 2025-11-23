"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export function NotFoundContent() {
    const router = useRouter();

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse" />
                <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse delay-1000" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 text-center">
                {/* Glass card */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-2xl">
                    {/* Icon */}
                    <div className="mb-10 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-50 animate-pulse" />
                            <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-full">
                                <FileQuestion className="w-16 h-16 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* 404 Text */}
                    <h1 className="text-7xl sm:text-8xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                        404
                    </h1>

                    {/* Message */}
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
                        Page Not Found
                    </h2>
                    <p className="text-base sm:text-lg text-gray-300 mb-10 max-w-md mx-auto px-4">
                        Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
                        <button
                            onClick={() => router.back()}
                            className="group px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl transition-all duration-300 flex items-center gap-3 text-white font-medium w-full sm:w-auto sm:min-w-[200px] justify-center"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Go Back
                        </button>

                        <Link
                            href="/vi"
                            className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl transition-all duration-300 flex items-center gap-3 text-white font-medium shadow-lg shadow-purple-500/50 w-full sm:w-auto sm:min-w-[200px] justify-center"
                        >
                            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Go Home
                        </Link>
                    </div>

                    {/* Additional help text */}
                    <div className="mt-10 pt-8 border-t border-white/10">
                        <p className="text-sm text-gray-400">
                            Need help?{" "}
                            <Link href="/vi" className="text-purple-400 hover:text-purple-300 underline transition-colors">
                                Contact support
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Floating particles */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute w-2 h-2 bg-purple-400 rounded-full top-1/4 left-1/4 animate-ping" />
                    <div className="absolute w-2 h-2 bg-pink-400 rounded-full top-3/4 right-1/4 animate-ping delay-500" />
                    <div className="absolute w-2 h-2 bg-blue-400 rounded-full bottom-1/4 left-1/2 animate-ping delay-1000" />
                </div>
            </div>
        </div>
    );
}
