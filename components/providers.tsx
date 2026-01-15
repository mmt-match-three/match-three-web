"use client";

import { PropsWithChildren } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { UserProvider } from "@/contexts/user-context";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: PropsWithChildren) {
    return (
        <ConvexProvider client={convex}>
            <UserProvider>{children}</UserProvider>
        </ConvexProvider>
    );
}
