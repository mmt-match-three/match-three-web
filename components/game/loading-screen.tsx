"use client";

import * as React from "react";

export function LoadingScreen() {
    const [dots, setDots] = React.useState("");

    React.useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 400);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-linear-to-b from-slate-900 via-purple-950 to-slate-900">
            {/* Animated gradient orbs - CSS only, no re-renders */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
                    style={{
                        background: "radial-gradient(circle, #a855f7 0%, transparent 70%)",
                        top: "10%",
                        left: "10%",
                        animation: "float 8s ease-in-out infinite",
                    }}
                />
                <div
                    className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
                    style={{
                        background: "radial-gradient(circle, #ec4899 0%, transparent 70%)",
                        top: "60%",
                        right: "10%",
                        animation: "float 10s ease-in-out infinite reverse",
                    }}
                />
                <div
                    className="absolute w-64 h-64 rounded-full opacity-10 blur-2xl"
                    style={{
                        background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
                        bottom: "20%",
                        left: "30%",
                        animation: "float 12s ease-in-out infinite 2s",
                    }}
                />
            </div>

            {/* CSS keyframes for smooth float animation */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.05); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                }
            `}</style>

            {/* Logo / Title */}
            <div className="relative z-10 text-center mb-12">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 mb-2 animate-pulse">
                    Три в ряд
                </h1>
                <div className="text-purple-300/60 text-sm tracking-widest uppercase">
                    Головоломка
                </div>
            </div>

            {/* Animated tiles preview */}
            <div className="relative z-10 flex gap-3 mb-12">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="w-12 h-12 rounded-xl shadow-lg animate-bounce"
                        style={{
                            background: [
                                "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                                "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                                "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
                                "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                            ][i],
                            animationDelay: `${i * 0.15}s`,
                            animationDuration: "1s",
                            boxShadow: `0 8px 20px ${
                                [
                                    "rgba(239, 68, 68, 0.4)",
                                    "rgba(34, 197, 94, 0.4)",
                                    "rgba(59, 130, 246, 0.4)",
                                    "rgba(234, 179, 8, 0.4)",
                                    "rgba(168, 85, 247, 0.4)",
                                ][i]
                            }`,
                        }}
                    />
                ))}
            </div>

            {/* Loading indicator */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                {/* Spinner */}
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-400 animate-spin" />
                    <div
                        className="absolute inset-2 rounded-full border-4 border-transparent border-t-pink-400 animate-spin"
                        style={{
                            animationDirection: "reverse",
                            animationDuration: "0.8s",
                        }}
                    />
                </div>

                {/* Loading text */}
                <div className="text-purple-200 font-medium text-lg min-w-[140px] text-center">
                    Загрузка{dots}
                </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-slate-900/80 to-transparent pointer-events-none" />
        </div>
    );
}
