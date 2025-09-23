declare module "adbkit-apkreader" {
    export function open(buffer: Buffer): Promise<ApkReader>;

    export interface ApkReader {
        readManifest(): Promise<Manifest>;
    }
    export interface Manifest {
        versionName: string;
        versionCode: number;
        package: string;
    }
}