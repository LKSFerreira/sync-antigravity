// Google OAuth 2.0: fluxo autogerenciado para aplicativo desktop
// Usa servidor HTTP local para receber o retorno e SecretStorage para persistir tokens

import * as http from "http";
import * as https from "https";
import * as crypto from "crypto";
import { ExtensionContext, Uri, env, window } from "vscode";
import Logger from "./logger";

// Configuração OAuth: injetada de .env durante a compilação pelo webpack DefinePlugin
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const SCOPES = [
    "https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
];
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const TOKEN_KEY = "antigravitysync.google.tokens";

export interface TokenData {
    access_token: string;
    refresh_token: string;
    expires_at: number; // Unix timestamp (ms)
}

export default class GoogleAuth {
    private context: ExtensionContext;
    private logger: Logger;
    private tokens: TokenData | null = null;

    constructor(logger: Logger, context: ExtensionContext) {
        this.logger = logger;
        this.context = context;
    }

    /** Verifica se a pessoa usuária está autenticada e se o token é válido */
    public async isAuthenticated(): Promise<boolean> {
        if (!this.tokens) {
            await this.restoreTokens();
        }
        if (!this.tokens) {
            return false;
        }
        // Atualiza se expirar nos próximos cinco minutos
        if (Date.now() > this.tokens.expires_at - 5 * 60 * 1000) {
            try {
                await this.refreshAccessToken();
                return true;
            } catch {
                return false;
            }
        }
        return true;
    }

    /** Obtém um token de acesso válido (atualiza automaticamente se necessário) */
    public async getAccessToken(): Promise<string> {
        if (!this.tokens) {
            await this.restoreTokens();
        }
        if (!this.tokens) {
            throw new Error(
                "Não autenticado. Inicie sessão com o Google primeiro."
            );
        }
        // Refresh if expiring within 5 minutes
        if (Date.now() > this.tokens.expires_at - 5 * 60 * 1000) {
            await this.refreshAccessToken();
        }
        return this.tokens!.access_token;
    }

    /** Inicia o fluxo de login OAuth: abre o navegador e aguarda o retorno */
    public async login(): Promise<void> {
        const state = crypto.randomBytes(16).toString("hex");

        // Inicia um servidor local para capturar o retorno
        const { port, codePromise } = await this.startCallbackServer(state);
        const redirectUri = `http://localhost:${port}/callback`;

        // Monta a URL OAuth
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: SCOPES.join(" "),
            state: state,
            access_type: "offline", // Obtém refresh_token
            prompt: "consent", // Força a tela de consentimento (garante refresh_token)
        });

        const authUrl = `${AUTH_URL}?${params.toString()}`;
        this.logger.info("Opening browser for Google login...");

        // Abre o navegador
        const opened = await env.openExternal(Uri.parse(authUrl));
        if (!opened) {
            throw new Error(
                "Falha ao abrir o navegador para iniciar sessão com o Google. Tente novamente."
            );
        }

        // Aguarda o retorno (limite de 30 s)
        const code = await codePromise;
        this.logger.info("Authorization code received, exchanging for tokens...");

        // Troca o código por tokens
        const tokenData = await this.exchangeCodeForTokens(code, redirectUri);
        this.tokens = tokenData;
        await this.saveTokens();

        this.logger.info("Google login successful!", true);
    }

    /** Encerra a sessão: remove os tokens */
    public async logout(): Promise<void> {
        this.tokens = null;
        await this.context.secrets.delete(TOKEN_KEY);
        this.logger.info("Sessão do Google encerrada", true);
    }

    /** Obtém informações da conta com sessão iniciada */
    public async getAccountInfo(): Promise<{
        email: string;
        name: string;
        picture?: string;
    } | null> {
        try {
            const token = await this.getAccessToken();
            const data = await this.httpsGet(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                token
            );
            const info = JSON.parse(data);
            return { email: info.email, name: info.name, picture: info.picture };
        } catch {
            return null;
        }
    }

    // ===== Métodos privados =====

    /** Inicia o servidor HTTP local para receber o retorno OAuth */
    private startCallbackServer(
        expectedState: string
    ): Promise<{ port: number; codePromise: Promise<string> }> {
        return new Promise((resolve, reject) => {
            const server = http.createServer();
            const timeout = setTimeout(() => {
                server.close();
                reject(new Error("O tempo para iniciar sessão expirou. Tente novamente."));
            }, 120_000); // 2 minute timeout

            const codePromise = new Promise<string>((resolveCode, rejectCode) => {
                server.on("request", (req, res) => {
                    const url = new URL(
                        req.url || "/",
                        `http://localhost`
                    );

                    if (url.pathname !== "/callback") {
                        res.writeHead(404);
                        res.end("Não encontrado");
                        return;
                    }

                    const code = url.searchParams.get("code");
                    const state = url.searchParams.get("state");
                    const error = url.searchParams.get("error");

                    if (error) {
                        res.writeHead(200, { "Content-Type": "text/html" });
                        res.end(this.getErrorHtml(error));
                        clearTimeout(timeout);
                        server.close();
                        rejectCode(
                            new Error(`Login do Google negado: ${error}`)
                        );
                        return;
                    }

                    if (state !== expectedState) {
                        res.writeHead(400, { "Content-Type": "text/html" });
                        res.end(this.getErrorHtml("Parâmetro state inválido"));
                        clearTimeout(timeout);
                        server.close();
                        rejectCode(
                            new Error("Incompatibilidade no state OAuth: possível ataque CSRF")
                        );
                        return;
                    }

                    if (!code) {
                        res.writeHead(400, { "Content-Type": "text/html" });
                        res.end(this.getErrorHtml("Nenhum código de autorização"));
                        clearTimeout(timeout);
                        server.close();
                        rejectCode(new Error("Nenhum código de autorização recebido"));
                        return;
                    }

                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(this.getSuccessHtml());
                    clearTimeout(timeout);
                    server.close();
                    resolveCode(code);
                });
            });

            server.listen(0, "127.0.0.1", () => {
                const addr = server.address();
                if (addr && typeof addr !== "string") {
                    resolve({ port: addr.port, codePromise });
                } else {
                    reject(new Error("Falha ao iniciar o servidor de retorno"));
                }
            });

            server.on("error", (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /** Troca o código de autorização por tokens */
    private async exchangeCodeForTokens(
        code: string,
        redirectUri: string
    ): Promise<TokenData> {
        const params = new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        });

        const data = await this.httpsPost(TOKEN_URL, params.toString());
        const response = JSON.parse(data);

        if (response.error) {
            throw new Error(
                `Falha na troca de token: ${response.error_description || response.error}`
            );
        }

        return {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            expires_at: Date.now() + response.expires_in * 1000,
        };
    }

    /** Atualiza o token de acesso usando refresh_token */
    private async refreshAccessToken(): Promise<void> {
        if (!this.tokens?.refresh_token) {
            throw new Error("Nenhum token de atualização disponível");
        }

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: this.tokens.refresh_token,
            grant_type: "refresh_token",
        });

        try {
            const data = await this.httpsPost(TOKEN_URL, params.toString());
            const response = JSON.parse(data);

            if (response.error) {
                // Token de atualização inválido ou revogado: é necessário iniciar sessão novamente
                this.logger.warn(
                    "A sessão do Google expirou. Inicie sessão novamente.",
                    true
                );
                this.tokens = null;
                await this.context.secrets.delete(TOKEN_KEY);
                throw new Error(
                    `Falha na atualização: ${response.error_description || response.error}`
                );
            }

            this.tokens.access_token = response.access_token;
            this.tokens.expires_at =
                Date.now() + response.expires_in * 1000;
            // O token de atualização só é retornado na primeira autenticação: mantém o existente
            if (response.refresh_token) {
                this.tokens.refresh_token = response.refresh_token;
            }
            await this.saveTokens();
            this.logger.info("Token de acesso atualizado com sucesso");
        } catch (error: any) {
            if (error.message?.includes("Falha na atualização")) {
                throw error;
            }
            this.logger.error(
                "Falha ao atualizar o token",
                "GoogleAuth.refreshAccessToken",
                true,
                error
            );
            throw error;
        }
    }

    /** Salva os tokens no SecretStorage */
    private async saveTokens(): Promise<void> {
        if (this.tokens) {
            await this.context.secrets.store(
                TOKEN_KEY,
                JSON.stringify(this.tokens)
            );
        }
    }

    /** Restaura os tokens do SecretStorage */
    private async restoreTokens(): Promise<void> {
        const stored = await this.context.secrets.get(TOKEN_KEY);
        if (stored) {
            try {
                this.tokens = JSON.parse(stored) as TokenData;
                this.logger.info("Tokens restaurados do armazenamento seguro");
            } catch {
                this.tokens = null;
            }
        }
    }

    /** Requisição HTTPS GET */
    private httpsGet(url: string, token: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const options = {
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => resolve(data));
            });
            req.on("error", reject);
            req.end();
        });
    }

    /** Requisição HTTPS POST (form-urlencoded) */
    private httpsPost(url: string, body: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const options = {
                hostname: parsed.hostname,
                path: parsed.pathname,
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(body),
                },
            };

            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => resolve(data));
            });
            req.on("error", reject);
            req.write(body);
            req.end();
        });
    }

    /** Página HTML de sucesso */
    private getSuccessHtml(): string {
        return `<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:60px;background:#1e1e2e;color:#cdd6f4">
<h1 style="color:#a6e3a1">✅ Sessão iniciada com sucesso!</h1>
<p>Você pode fechar esta aba e retornar ao Antigravity.</p>
<script>setTimeout(()=>window.close(),3000)</script>
</body></html>`;
    }

    /** Página HTML de erro */
    private getErrorHtml(error: string): string {
        return `<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:60px;background:#1e1e2e;color:#cdd6f4">
<h1 style="color:#f38ba8">❌ Falha ao iniciar sessão</h1>
<p>${error}</p>
<p>Feche esta aba e tente novamente no Antigravity.</p>
</body></html>`;
    }
}
