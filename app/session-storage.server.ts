// app/session-storage.server.ts
import { SessionStorage } from "@shopify/shopify-app-session-storage";
import { Session } from "@shopify/shopify-api";
import { apiCall } from "./api.server";

export class RestSessionStorage implements SessionStorage {
    async storeSession(session: Session): Promise<boolean> {
        try {
            await apiCall('/api/sessions', 'POST', session.toObject());
            return true;
        } catch (e) {
            console.error('RestSessionStorage: Failed to store session', e);
            return false;
        }
    }

    async loadSession(id: string): Promise<Session | undefined> {
        try {
            const raw = await apiCall(`/api/sessions/${encodeURIComponent(id)}`, 'GET');
            if (raw) {
                return new Session(raw);
            }
            return undefined;
        } catch (e) {
            return undefined;
        }
    }

    async deleteSession(id: string): Promise<boolean> {
        return true; // No-op mostly for this flow
    }

    async deleteSessions(shopIds: string[]): Promise<boolean> {
        return true;
    }

    async findSessionsByShop(shop: string): Promise<Session[]> {
        return [];
    }
}
