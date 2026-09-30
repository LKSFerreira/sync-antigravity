// GoogleDriveService: operações CRUD para a API v3 do Google Drive
// Usa appDataFolder com armazenamento de perfis baseado em pastas

import * as https from "https";
import { IProfile, IProfileMeta, ISyncItem, ISyncMeta } from "../models/interfaces";
import { MAX_REMOTE_PROFILE_FILE_BYTES } from "./profile-validator";
import GoogleAuth from "./google-auth";
import Logger from "./logger";

const DRIVE_API = "https://www.googleapis.com";
const DRIVE_FILES = "/drive/v3/files";
const DRIVE_UPLOAD = "/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_SYNC_META_BYTES = 256 * 1024;
const MAX_PROFILE_META_BYTES = 64 * 1024;
const MAX_SYNC_META_PROFILES = 256;
const VALID_SYNC_KEYS = new Set(["settings", "extensions", "keybindings", "snippets", "layout"]);

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
}

interface DriveFileList {
    files: DriveFile[];
}

/** Metadados de arquivo/pasta para o Explorador de dados do aplicativo */
export interface AppDataFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
    createdTime?: string;
}

/** Informações da pasta de perfil retornadas por listProfiles */
export interface ProfileFolder {
    id: string;
    name: string;
    modifiedTime?: string;
    syncKeys?: string[];  // Vem de meta.json
}

/** Retorno de progresso para operações de sincronização */
export type ProgressCallback = (step: string, current: number, total: number, status: "pending" | "active" | "done") => void;

export default class GoogleDriveService {
    private auth: GoogleAuth;
    private logger: Logger;

    constructor(auth: GoogleAuth, logger: Logger) {
        this.auth = auth;
        this.logger = logger;
    }

    // ===== CRUD de perfis (baseados em pastas) =====

    /** Lista todas as pastas de perfis em appDataFolder */
    public async listProfiles(): Promise<ProfileFolder[]> {
        const token = await this.auth.getAccessToken();
        const params = new URLSearchParams({
            spaces: "appDataFolder",
            fields: "files(id, name, mimeType, modifiedTime)",
            q: `mimeType = '${FOLDER_MIME}' and trashed = false`,
        });

        const data = await this.httpsGet(
            `${DRIVE_API}${DRIVE_FILES}?${params.toString()}`,
            token
        );
        const result = JSON.parse(data) as DriveFileList;
        const folders = (result.files || []).map(f => ({
            id: f.id,
            name: f.name,
            modifiedTime: f.modifiedTime,
        }));

        // Lê sync-meta.json na raiz (uma chamada de API em vez de N)
        const syncMeta = await this.getSyncMeta();
        return folders.map(f => ({
            ...f,
            syncKeys: syncMeta[f.name],
        }));
    }

    /** Obtém um perfil pelo nome da pasta: baixa arquivos conforme syncItems */
    public async getProfile(profileName: string, syncItems: ISyncItem[], onProgress?: ProgressCallback): Promise<IProfile | null> {
        this.assertValidProfileName(profileName);
        const enabledItems = syncItems.filter(i => i.enabled);
        const steps = ["Localizando perfil", ...enabledItems.map(i => `Baixando ${i.label}`)];
        let stepIdx = 0;

        // Emite primeiro todas as etapas como pendentes
        if (onProgress) {
            for (let i = 0; i < steps.length; i++) {
                onProgress(steps[i], i, steps.length, "pending");
            }
        }

        onProgress?.(steps[0], stepIdx, steps.length, "active");
        const folder = await this.findFolder(profileName);
        if (!folder) { return null; }
        onProgress?.(steps[0], stepIdx++, steps.length, "done");

        const files = await this.listFolderContents(folder.id);
        const profile: IProfile = { profileName, data: {} };

        for (const item of enabledItems) {
            const stepLabel = `Baixando ${item.label}`;
            onProgress?.(stepLabel, stepIdx, steps.length, "active");

            const matchingFiles = files.filter((candidate) => candidate.name === item.fileName);
            if (matchingFiles.length > 1) {
                throw new Error(`O perfil contém cópias duplicadas de ${item.fileName}`);
            }
            const file = matchingFiles[0];
            if (file) {
                const declaredSize = Number(file.size);
                if (Number.isFinite(declaredSize) && declaredSize > MAX_REMOTE_PROFILE_FILE_BYTES) {
                    throw new Error(`${item.label} remoto excede o tamanho permitido`);
                }
                const content = await this.downloadFileContent(file.id, MAX_REMOTE_PROFILE_FILE_BYTES);
                try {
                    profile.data[item.key] = JSON.parse(content);
                } catch (error) {
                    this.logger.error(`Falha ao analisar ${item.fileName} em ${profileName}`, "getProfile", false, error);
                    throw new Error(`${item.label} remoto não contém JSON válido`);
                }
            }
            onProgress?.(stepLabel, stepIdx++, steps.length, "done");
        }

        return profile;
    }

    /** Salva o perfil: cria ou atualiza a pasta e os arquivos conforme syncItems */
    public async saveProfile(profile: IProfile, syncItems: ISyncItem[], onProgress?: ProgressCallback): Promise<void> {
        this.assertValidProfileName(profile.profileName);
        let folder = await this.findFolder(profile.profileName);
        const now = new Date().toISOString();
        const isNew = !folder;
        const enabledItems = syncItems.filter(i => i.enabled);

        const steps = isNew
            ? ["Criando pasta", ...enabledItems.map(i => `Enviando ${i.label}`), "Salvando metadados"]
            : [...enabledItems.map(i => `Enviando ${i.label}`), "Atualizando metadados"];
        let stepIdx = 0;

        // Emit all steps as pending first
        if (onProgress) {
            for (let i = 0; i < steps.length; i++) {
                onProgress(steps[i], i, steps.length, "pending");
            }
        }

        if (isNew) {
            onProgress?.("Criando pasta", stepIdx, steps.length, "active");
            folder = await this.createFolder(profile.profileName);
            onProgress?.("Criando pasta", stepIdx++, steps.length, "done");

            for (const item of enabledItems) {
                const label = `Enviando ${item.label}`;
                onProgress?.(label, stepIdx, steps.length, "active");
                const content = JSON.stringify(profile.data[item.key] ?? {}, null, 2);
                await this.createFileInFolder(folder!.id, item.fileName, content);
                onProgress?.(label, stepIdx++, steps.length, "done");
            }

            // meta.json
            const syncKeys = enabledItems.map(i => i.key);
            const metaLabel = "Salvando metadados";
            onProgress?.(metaLabel, stepIdx, steps.length, "active");
            await this.createFileInFolder(folder!.id, "meta.json", JSON.stringify({
                name: profile.profileName, createdAt: now, updatedAt: now, syncKeys,
            } as IProfileMeta, null, 2));
            onProgress?.(metaLabel, stepIdx++, steps.length, "done");

            // Atualiza sync-meta.json na raiz
            await this.updateSyncMeta(profile.profileName, syncKeys);
            this.logger.info(`Perfil criado: ${profile.profileName}`);
        } else {
            const files = await this.listFolderContents(folder!.id);
            const fileMap = new Map(files.map(f => [f.name, f.id]));

            for (const item of enabledItems) {
                const label = `Enviando ${item.label}`;
                onProgress?.(label, stepIdx, steps.length, "active");
                const content = JSON.stringify(profile.data[item.key] ?? {}, null, 2);
                const existingId = fileMap.get(item.fileName);
                if (existingId) {
                    await this.updateFile(existingId, content);
                } else {
                    await this.createFileInFolder(folder!.id, item.fileName, content);
                }
                onProgress?.(label, stepIdx++, steps.length, "done");
            }

            // Atualiza meta.json
            const metaLabel = "Atualizando metadados";
            onProgress?.(metaLabel, stepIdx, steps.length, "active");
            const metaId = fileMap.get("meta.json");
            const syncKeys = enabledItems.map(i => i.key);
            const metaContent = JSON.stringify({
                name: profile.profileName, createdAt: now, updatedAt: now, syncKeys,
            } as IProfileMeta, null, 2);

            if (metaId) {
                try {
                    const metaRaw = await this.downloadFileContent(metaId, MAX_PROFILE_META_BYTES);
                    const meta = this.parseProfileMeta(metaRaw, profile.profileName);
                    meta.updatedAt = now;
                    meta.syncKeys = syncKeys;
                    await this.updateFile(metaId, JSON.stringify(meta, null, 2));
                } catch {
                    await this.updateFile(metaId, metaContent);
                }
            } else {
                await this.createFileInFolder(folder!.id, "meta.json", metaContent);
            }
            onProgress?.(metaLabel, stepIdx++, steps.length, "done");

            // Update sync-meta.json at root
            await this.updateSyncMeta(profile.profileName, syncKeys);
            this.logger.info(`Perfil atualizado: ${profile.profileName}`);
        }
    }

    /** Exclui uma pasta de perfil (e todo seu conteúdo) */
    public async deleteProfile(profileName: string): Promise<void> {
        this.assertValidProfileName(profileName);
        const folder = await this.findFolder(profileName);
        if (!folder) {
            throw new Error(`Perfil "${profileName}" não encontrado`);
        }
        await this.deleteFile(folder.id);
        // Atualiza sync-meta.json: remove a entrada
        await this.updateSyncMeta(profileName);
        this.logger.info(`Perfil excluído: ${profileName}`);
    }

    // ===== Explorador de dados do aplicativo =====

    /** Lista arquivos/pastas em appDataFolder: página única */
    public async listAppDataFiles(parentId?: string, pageToken?: string): Promise<{ files: AppDataFile[]; nextPageToken?: string }> {
        const token = await this.auth.getAccessToken();
        const PAGE_SIZE = 20;

        const q = parentId
            ? `'${parentId}' in parents and trashed = false`
            : "'appDataFolder' in parents and trashed = false";
        const params = new URLSearchParams({
            spaces: "appDataFolder",
            fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime)",
            q,
            pageSize: String(PAGE_SIZE),
        });
        if (pageToken) { params.set("pageToken", pageToken); }

        const data = await this.httpsGet(
            `${DRIVE_API}${DRIVE_FILES}?${params.toString()}`,
            token
        );
        const result = JSON.parse(data);
        const files: AppDataFile[] = result.files || [];
        const hasMore = files.length >= PAGE_SIZE && result.nextPageToken;

        return {
            files,
            nextPageToken: hasMore ? result.nextPageToken : undefined,
        };
    }

    /** Baixa o conteúdo bruto de um arquivo pelo ID */
    public async downloadFileContent(fileId: string, maxBytes: number = MAX_REMOTE_PROFILE_FILE_BYTES): Promise<string> {
        const token = await this.auth.getAccessToken();
        return this.httpsGet(
            `${DRIVE_API}${DRIVE_FILES}/${fileId}?alt=media`,
            token,
            maxBytes
        );
    }

    // ===== Metadados de sincronização (nível raiz) =====

    /** Localiza um arquivo pelo nome na raiz de appDataFolder */
    private async findRootFile(name: string): Promise<DriveFile | null> {
        const token = await this.auth.getAccessToken();
        const params = new URLSearchParams({
            spaces: "appDataFolder",
            fields: "files(id, name, size)",
            q: `name = '${name}' and 'appDataFolder' in parents and mimeType != '${FOLDER_MIME}' and trashed = false`,
        });
        const data = await this.httpsGet(`${DRIVE_API}${DRIVE_FILES}?${params.toString()}`, token);
        const result = JSON.parse(data) as DriveFileList;
        return result.files?.[0] || null;
    }

    /** Lê sync-meta.json da raiz */
    private async getSyncMeta(): Promise<ISyncMeta> {
        try {
            const file = await this.findRootFile("sync-meta.json");
            if (!file) { return {}; }
            const declaredSize = Number(file.size);
            if (Number.isFinite(declaredSize) && declaredSize > MAX_SYNC_META_BYTES) {
                throw new Error("sync-meta.json excede o tamanho permitido");
            }
            const raw = await this.downloadFileContent(file.id, MAX_SYNC_META_BYTES);
            return this.parseSyncMeta(raw);
        } catch (error) {
            this.logger.warn(`sync-meta.json ignorado por segurança: ${(error as Error).message}`);
            return {};
        }
    }

    /** Atualiza ou remove uma entrada em sync-meta.json */
    private async updateSyncMeta(profileName: string, syncKeys?: string[]): Promise<void> {
        try {
            const meta = await this.getSyncMeta();
            if (syncKeys) {
                meta[profileName] = syncKeys;
            } else {
                delete meta[profileName];
            }
            const content = JSON.stringify(meta, null, 2);
            const file = await this.findRootFile("sync-meta.json");
            if (file) {
                await this.updateFile(file.id, content);
            } else {
                // Cria sync-meta.json na raiz
                const token = await this.auth.getAccessToken();
                const metadata = JSON.stringify({ name: "sync-meta.json", parents: ["appDataFolder"] });
                const boundary = "sync_meta_boundary";
                const body = [
                    `--${boundary}`, "Content-Type: application/json; charset=UTF-8", "", metadata,
                    `--${boundary}`, "Content-Type: application/json", "", content,
                    `--${boundary}--`,
                ].join("\r\n");
                await this.httpsRequest(
                    `${DRIVE_API}${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name`,
                    "POST", token, body, `multipart/related; boundary=${boundary}`
                );
            }
        } catch (err) {
            this.logger.error("Falha ao atualizar sync-meta.json", "updateSyncMeta", false, err);
        }
    }

    // ===== Auxiliares de pasta =====

    /** Impede que nomes recebidos remotamente sejam interpolados na consulta do Drive. */
    private assertValidProfileName(name: string): void {
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) {
            throw new Error("Nome de perfil inválido");
        }
    }

    /** Aceita somente o índice esperado de perfis e itens reconhecidos. */
    private parseSyncMeta(raw: string): ISyncMeta {
        const data = JSON.parse(raw) as unknown;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("sync-meta.json inválido");
        }
        const entries = Object.entries(data as Record<string, unknown>);
        if (entries.length > MAX_SYNC_META_PROFILES) {
            throw new Error("sync-meta.json contém perfis demais");
        }
        const meta: ISyncMeta = {};
        for (const [profileName, syncKeys] of entries) {
            this.assertValidProfileName(profileName);
            if (!Array.isArray(syncKeys) || syncKeys.length === 0 || syncKeys.length > VALID_SYNC_KEYS.size) {
                throw new Error("Itens de sincronização inválidos em sync-meta.json");
            }
            if (syncKeys.some((key) => typeof key !== "string" || !VALID_SYNC_KEYS.has(key)) || new Set(syncKeys).size !== syncKeys.length) {
                throw new Error("Itens de sincronização inválidos em sync-meta.json");
            }
            meta[profileName] = syncKeys;
        }
        return meta;
    }

    /** Valida o meta.json que será reutilizado durante a atualização de um perfil. */
    private parseProfileMeta(raw: string, expectedProfileName: string): IProfileMeta {
        const data = JSON.parse(raw) as Partial<IProfileMeta>;
        if (
            !data ||
            typeof data.name !== "string" ||
            typeof data.createdAt !== "string" ||
            typeof data.updatedAt !== "string" ||
            !Number.isFinite(Date.parse(data.createdAt)) ||
            !Number.isFinite(Date.parse(data.updatedAt)) ||
            !Array.isArray(data.syncKeys) ||
            data.syncKeys.some((key) => typeof key !== "string" || !VALID_SYNC_KEYS.has(key)) ||
            new Set(data.syncKeys).size !== data.syncKeys.length
        ) {
            throw new Error("meta.json inválido");
        }
        this.assertValidProfileName(data.name);
        if (data.name !== expectedProfileName) {
            throw new Error("meta.json pertence a outro perfil");
        }
        return data as IProfileMeta;
    }

    /** Localiza uma pasta pelo nome na raiz de appDataFolder */
    private async findFolder(name: string): Promise<DriveFile | null> {
        const token = await this.auth.getAccessToken();
        const params = new URLSearchParams({
            spaces: "appDataFolder",
            fields: "files(id, name, mimeType, size)",
            q: `mimeType = '${FOLDER_MIME}' and name = '${name}' and trashed = false`,
        });

        const data = await this.httpsGet(
            `${DRIVE_API}${DRIVE_FILES}?${params.toString()}`,
            token
        );
        const result = JSON.parse(data) as DriveFileList;
        return result.files?.[0] || null;
    }

    /** Cria uma pasta em appDataFolder */
    private async createFolder(name: string): Promise<DriveFile> {
        const token = await this.auth.getAccessToken();
        const metadata = JSON.stringify({
            name,
            mimeType: FOLDER_MIME,
            parents: ["appDataFolder"],
        });

        const data = await this.httpsRequest(
            `${DRIVE_API}${DRIVE_FILES}?fields=id,name,mimeType`,
            "POST",
            token,
            metadata,
            "application/json"
        );
        return JSON.parse(data) as DriveFile;
    }

    /** Cria um arquivo dentro de uma pasta específica */
    private async createFileInFolder(folderId: string, name: string, content: string): Promise<DriveFile> {
        const token = await this.auth.getAccessToken();
        const metadata = JSON.stringify({
            name,
            parents: [folderId],
        });

        const boundary = "antigravity_sync_boundary";
        const body = [
            `--${boundary}`,
            "Content-Type: application/json; charset=UTF-8",
            "",
            metadata,
            `--${boundary}`,
            "Content-Type: application/json",
            "",
            content,
            `--${boundary}--`,
        ].join("\r\n");

        const data = await this.httpsRequest(
            `${DRIVE_API}${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name`,
            "POST",
            token,
            body,
            `multipart/related; boundary=${boundary}`
        );
        return JSON.parse(data) as DriveFile;
    }

    /** Lista arquivos dentro de uma pasta */
    private async listFolderContents(folderId: string): Promise<DriveFile[]> {
        const token = await this.auth.getAccessToken();
        const params = new URLSearchParams({
            spaces: "appDataFolder",
            fields: "files(id, name, mimeType, size)",
            q: `'${folderId}' in parents and trashed = false`,
        });

        const data = await this.httpsGet(
            `${DRIVE_API}${DRIVE_FILES}?${params.toString()}`,
            token
        );
        const result = JSON.parse(data) as DriveFileList;
        return result.files || [];
    }

    // ===== CRUD privado =====

    /** Atualiza o conteúdo de um arquivo existente */
    private async updateFile(fileId: string, content: string): Promise<void> {
        const token = await this.auth.getAccessToken();
        await this.httpsRequest(
            `${DRIVE_API}${DRIVE_UPLOAD}/${fileId}?uploadType=media`,
            "PATCH",
            token,
            content,
            "application/json"
        );
    }

    /** Exclui um arquivo/pasta pelo ID */
    private async deleteFile(fileId: string): Promise<void> {
        const token = await this.auth.getAccessToken();
        await this.httpsRequest(
            `${DRIVE_API}${DRIVE_FILES}/${fileId}`,
            "DELETE",
            token,
            "",
            "application/json"
        );
    }

    // ===== Auxiliares HTTP =====

    private httpsGet(
        url: string,
        token: string,
        maxBytes: number = MAX_REMOTE_PROFILE_FILE_BYTES
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const options = {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            };
            const req = https.request(options, (res) => {
                let data = "";
                let receivedBytes = 0;
                let rejectedForSize = false;
                res.on("data", (chunk) => {
                    receivedBytes += Buffer.byteLength(chunk);
                    if (receivedBytes > maxBytes) {
                        rejectedForSize = true;
                        res.destroy();
                        reject(new Error("Arquivo remoto excede o tamanho permitido"));
                        return;
                    }
                    data += chunk;
                });
                res.on("end", () => {
                    if (rejectedForSize) {
                        return;
                    }
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(
                            new Error(
                                `Erro da API do Drive ${res.statusCode}: ${data}`
                            )
                        );
                    } else {
                        resolve(data);
                    }
                });
            });
            req.on("error", reject);
            req.end();
        });
    }

    private httpsRequest(
        url: string,
        method: string,
        token: string,
        body: string,
        contentType: string
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const options = {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": contentType,
                    "Content-Length": Buffer.byteLength(body),
                },
            };
            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(
                            new Error(
                                `Erro da API do Drive ${res.statusCode}: ${data}`
                            )
                        );
                    } else {
                        resolve(data);
                    }
                });
            });
            req.on("error", reject);
            req.write(body);
            req.end();
        });
    }
}
