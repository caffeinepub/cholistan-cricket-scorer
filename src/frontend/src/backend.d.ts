import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface AnnouncementData {
    text: string;
    image?: ExternalBlob;
}
export interface backendInterface {
    addLike(id: bigint): Promise<bigint>;
    createOrUpdateAnnouncement(password: string, id: bigint, text: string): Promise<void>;
    deleteMedia(password: string, id: bigint): Promise<void>;
    getAllMatches(): Promise<Array<string>>;
    getAnnouncement(id: bigint): Promise<AnnouncementData | null>;
    getLikeCount(): Promise<bigint>;
    getSeenCount(): Promise<bigint>;
    getTeamByPhone(phone: string): Promise<string | null>;
    getTeams(): Promise<Array<string>>;
    getTotalMatches(): Promise<bigint>;
    getTotalTeams(): Promise<bigint>;
    getTotalUsers(): Promise<bigint>;
    registerUser(phone: string, name: string): Promise<void>;
    saveSeenCount(id: bigint): Promise<bigint>;
    syncMatch(phone: string, match: string): Promise<bigint>;
    syncTeam(phone: string, team: string): Promise<bigint>;
    syncRules(phone: string, rulesJson: string): Promise<bigint>;
    getRulesByPhone(phone: string): Promise<string | null>;
}
