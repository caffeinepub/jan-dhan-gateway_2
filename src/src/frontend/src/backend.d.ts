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
export type Time = bigint;
export interface Citizen {
    id: string;
    dob: Time;
    claims: bigint;
    accountStatus: AccountStatus;
    aadhaarStatus: AadhaarStatus;
    scheme: string;
    name: string;
    lastClaim?: Time;
    gender: Gender;
    photo?: ExternalBlob;
    amount: bigint;
    maritalStatus: MaritalStatus;
}
export interface Transaction {
    id: string;
    status: ClaimStatus;
    scheme: string;
    citizenId: string;
    timestamp: Time;
    amount: bigint;
}
export interface InputCitizen {
    id: string;
    dob: Time;
    scheme: string;
    name: string;
    gender: Gender;
    photo?: ExternalBlob;
    amount: bigint;
    maritalStatus: MaritalStatus;
}
export enum AadhaarStatus {
    linked = "linked",
    unlinked = "unlinked"
}
export enum AccountStatus {
    active = "active",
    inactive = "inactive"
}
export enum ClaimStatus {
    denied = "denied",
    approved = "approved"
}
export enum Gender {
    other = "other",
    female = "female",
    male = "male"
}
export enum MaritalStatus {
    widowed = "widowed",
    married = "married",
    single = "single",
    divorced = "divorced"
}
export enum SystemStatus {
    active = "active",
    frozen = "frozen",
    paused = "paused"
}
export interface backendInterface {
    addCitizen(input: InputCitizen): Promise<void>;
    addCitizens(batch: Array<InputCitizen>): Promise<void>;
    claimBenefits(id: string, scheme: string, amount: bigint): Promise<string>;
    countCitizens(): Promise<bigint>;
    countTransactions(): Promise<bigint>;
    deleteAllInactiveCitizens(): Promise<void>;
    getAllCitizens(): Promise<Array<Citizen>>;
    getBudget(): Promise<bigint>;
    getCitizen(id: string): Promise<Citizen | null>;
    getSystemStatus(): Promise<SystemStatus>;
    getTotalDisbursed(): Promise<bigint>;
    getTransactions(): Promise<Array<Transaction>>;
    resetBudget(amount: bigint): Promise<void>;
    setSystemStatus(status: SystemStatus): Promise<void>;
    updateAadhaarStatus(id: string, status: AadhaarStatus): Promise<void>;
}
