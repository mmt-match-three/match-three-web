"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    PropsWithChildren,
} from "react";
import { retrieveLaunchParams, type LaunchParams } from "@tma.js/sdk-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type UserContextType = {
    userId: Id<"users"> | null;
    isLoading: boolean;
    error: Error | null;
};

const UserContext = createContext<UserContextType>({
    userId: null,
    isLoading: true,
    error: null,
});

export function UserProvider({ children }: PropsWithChildren) {
    const ensureUser = useMutation(api.users.ensureUser);
    const [userId, setUserId] = useState<Id<"users"> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initUser = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Retrieve launch params only on client side
                let lp: LaunchParams;
                try {
                    lp = retrieveLaunchParams();
                } catch {
                    setIsLoading(false);
                    return;
                }

                const telegramUser = lp?.tgWebAppData?.user;

                if (!telegramUser) {
                    throw new Error("No Telegram user data available");
                }

                // Get or create user once, cache the ID
                const user = await ensureUser({
                    telegramUser: {
                        id: telegramUser.id,
                        firstName: telegramUser.first_name,
                        lastName: telegramUser.last_name,
                        username: telegramUser.username,
                    },
                });

                if (user?._id) {
                    setUserId(user._id);
                } else {
                    throw new Error("Failed to get user ID");
                }
            } catch (err) {
                console.error("Failed to initialize user:", err);
                setError(
                    err instanceof Error ? err : new Error("Unknown error")
                );
            } finally {
                setIsLoading(false);
            }
        };

        initUser();
    }, [ensureUser]);

    return (
        <UserContext.Provider value={{ userId, isLoading, error }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within UserProvider");
    }
    return context;
}
