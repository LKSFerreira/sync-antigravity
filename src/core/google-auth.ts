// Google OAuth 2.0: fluxo autogerenciado para aplicativo desktop
// Usa servidor HTTP local para receber o retorno e SecretStorage para persistir tokens

import * as http from "http";
import * as https from "https";
import * as crypto from "crypto";
import { ExtensionContext, Uri, env, window } from "vscode";
import Logger from "./logger";
import { LOGIN_SUCCESS_EFFECT_MARKUP, LOGIN_SUCCESS_EFFECT_STYLES } from "./login-success-effect";

// Configuração OAuth: injetada de .env durante a compilação pelo webpack DefinePlugin
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SCOPES = [
    "https://www.googleapis.com/auth/drive.appdata",
];
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const TOKEN_KEY = "antigravitysync.google.tokens";

export interface TokenData {
    access_token: string;
    refresh_token: string;
    expires_at: number; // Unix timestamp (ms)
}

interface CallbackSession {
    port: number;
    codePromise: Promise<string>;
    completeSuccess: () => void;
    completeError: (error: Error) => void;
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
        const clientId = this.getClientId();
        const state = crypto.randomBytes(32).toString("hex");
        const codeVerifier = crypto.randomBytes(32).toString("base64url");
        const codeChallenge = crypto
            .createHash("sha256")
            .update(codeVerifier)
            .digest("base64url");

        // Inicia um servidor local para capturar o retorno
        const { port, codePromise, completeSuccess, completeError } = await this.startCallbackServer(state);
        const redirectUri = `http://127.0.0.1:${port}/callback`;

        // Monta a URL OAuth
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: SCOPES.join(" "),
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            access_type: "offline", // Obtém refresh_token
            prompt: "consent", // Força a tela de consentimento (garante refresh_token)
        });

        const authUrl = `${AUTH_URL}?${params.toString()}`;
        this.logger.info("Opening browser for Google login...");

        // Abre o navegador
        const opened = await env.openExternal(Uri.parse(authUrl));
        if (!opened) {
            const error = new Error(
                "Falha ao abrir o navegador para iniciar sessão com o Google. Tente novamente."
            );
            completeError(error);
            throw error;
        }

        try {
            const code = await codePromise;
            this.logger.info("Código de autorização recebido. Trocando por tokens...");

            const tokenData = await this.exchangeCodeForTokens(code, redirectUri, codeVerifier);
            this.tokens = tokenData;
            await this.saveTokens();
            completeSuccess();

            this.logger.info("Sessão do Google iniciada com sucesso", true);
        } catch (error) {
            const loginError = error instanceof Error ? error : new Error(String(error));
            completeError(loginError);
            throw loginError;
        }
    }

    /** Encerra a sessão: remove os tokens */
    public async logout(): Promise<void> {
        this.tokens = null;
        await this.context.secrets.delete(TOKEN_KEY);
        this.logger.info("Sessão do Google encerrada", true);
    }

    // ===== Métodos privados =====

    /** Obtém o Client ID público e impede a execução com um placeholder de desenvolvimento. */
    private getClientId(): string {
        if (!CLIENT_ID || CLIENT_ID === "undefined" || CLIENT_ID.startsWith("your_client_id")) {
            throw new Error(
                "GOOGLE_CLIENT_ID não foi configurado. Crie o Client ID desktop do Sync Antigravity e informe-o no arquivo .env antes de empacotar a extensão."
            );
        }
        return CLIENT_ID;
    }

    /** Obtém o identificador técnico exigido pelo cliente OAuth desktop do Google. */
    private getClientSecret(): string {
        if (!CLIENT_SECRET || CLIENT_SECRET === "undefined" || CLIENT_SECRET.startsWith("your_client_secret")) {
            throw new Error(
                "GOOGLE_CLIENT_SECRET não foi configurado. Copie o valor client_secret do JSON do cliente OAuth desktop para o arquivo .env antes de empacotar a extensão."
            );
        }
        return CLIENT_SECRET;
    }

    /** Inicia o servidor HTTP local para receber o retorno OAuth */
    private startCallbackServer(
        expectedState: string
    ): Promise<CallbackSession> {
        return new Promise((resolve, reject) => {
            const server = http.createServer();
            let resolveCode!: (code: string) => void;
            let rejectCode!: (error: Error) => void;
            let completed = false;
            let authorizationReceived = false;
            let callbackResponse: http.ServerResponse | undefined;
            const codePromise = new Promise<string>((resolveCodePromise, rejectCodePromise) => {
                resolveCode = resolveCodePromise;
                rejectCode = rejectCodePromise;
            });
            const complete = (html?: string) => {
                if (completed) {
                    return;
                }
                completed = true;
                clearTimeout(timeout);
                if (callbackResponse && !callbackResponse.writableEnded) {
                    callbackResponse.end(html);
                }
                server.close();
            };
            const completeSuccess = () => complete(this.getSuccessHtml());
            const completeError = (error: Error) => complete(this.getCompletionErrorHtml(error.message));
            const rejectAuthorization = (error: Error, res: http.ServerResponse) => {
                if (completed) {
                    return;
                }
                callbackResponse = res;
                res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
                complete(this.getErrorHtml(error.message));
                rejectCode(error);
            };
            const timeout = setTimeout(() => {
                if (!authorizationReceived) {
                    const error = new Error("O tempo para iniciar sessão expirou. Tente novamente.");
                    completeError(error);
                    rejectCode(error);
                }
            }, 120_000);

            server.on("request", (req, res) => {
                if (completed) {
                    res.writeHead(410);
                    res.end("Fluxo de autenticação já concluído");
                    return;
                }
                const url = new URL(req.url || "/", "http://127.0.0.1");

                if (url.pathname !== "/callback") {
                    res.writeHead(404);
                    res.end("Não encontrado");
                    return;
                }

                const code = url.searchParams.get("code");
                const state = url.searchParams.get("state");
                const error = url.searchParams.get("error");

                if (error) {
                    rejectAuthorization(new Error(`Login do Google negado: ${error}`), res);
                    return;
                }

                if (!this.isExpectedState(state, expectedState)) {
                    rejectAuthorization(new Error("Incompatibilidade no state OAuth: possível ataque CSRF"), res);
                    return;
                }

                if (!code) {
                    rejectAuthorization(new Error("Nenhum código de autorização recebido"), res);
                    return;
                }

                authorizationReceived = true;
                clearTimeout(timeout);
                callbackResponse = res;
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.write(this.getPendingLoginHtml());
                resolveCode(code);
            });

            server.listen(0, "127.0.0.1", () => {
                const addr = server.address();
                if (addr && typeof addr !== "string") {
                    resolve({ port: addr.port, codePromise, completeSuccess, completeError });
                } else {
                    reject(new Error("Falha ao iniciar o servidor de retorno"));
                }
            });

            server.on("error", (err) => {
                completeError(err);
                if (!authorizationReceived) {
                    rejectCode(err);
                }
                reject(err);
            });
        });
    }

    /** Compara o state sem permitir diferença de tempo observável. */
    private isExpectedState(received: string | null, expected: string): boolean {
        if (!received) {
            return false;
        }
        const receivedBuffer = Buffer.from(received, "utf8");
        const expectedBuffer = Buffer.from(expected, "utf8");
        return receivedBuffer.length === expectedBuffer.length
            && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    }

    /** Troca o código de autorização por tokens */
    private async exchangeCodeForTokens(
        code: string,
        redirectUri: string,
        codeVerifier: string
    ): Promise<TokenData> {
        const params = new URLSearchParams({
            code,
            client_id: this.getClientId(),
            client_secret: this.getClientSecret(),
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
            code_verifier: codeVerifier,
        });
        const data = await this.httpsPost(TOKEN_URL, params.toString());
        const response = this.parseTokenResponse(data, true);

        return {
            access_token: response.access_token,
            refresh_token: response.refresh_token!,
            expires_at: Date.now() + response.expires_in * 1000,
        };
    }

    /** Atualiza o token de acesso usando refresh_token */
    private async refreshAccessToken(): Promise<void> {
        if (!this.tokens?.refresh_token) {
            throw new Error("Nenhum token de atualização disponível");
        }

        const params = new URLSearchParams({
            client_id: this.getClientId(),
            client_secret: this.getClientSecret(),
            refresh_token: this.tokens.refresh_token,
            grant_type: "refresh_token",
        });
        try {
            const data = await this.httpsPost(TOKEN_URL, params.toString());
            const response = this.parseTokenResponse(data, false);

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
            if (error.message?.startsWith("Falha no OAuth:")) {
                this.logger.warn(
                    "A sessão do Google expirou ou foi revogada. Inicie sessão novamente.",
                    true
                );
                this.tokens = null;
                await this.context.secrets.delete(TOKEN_KEY);
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
                const parsed = JSON.parse(stored) as Partial<TokenData>;
                if (!this.isValidTokenData(parsed)) {
                    throw new Error("Formato de token inválido");
                }
                this.tokens = parsed;
                this.logger.info("Tokens restaurados do armazenamento seguro");
            } catch {
                this.tokens = null;
                await this.context.secrets.delete(TOKEN_KEY);
            }
        }
    }

    /** Requisição HTTPS POST (form-urlencoded) */
    private httpsPost(url: string, body: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let settled = false;
            const resolveOnce = (value: string) => {
                if (!settled) {
                    settled = true;
                    resolve(value);
                }
            };
            const rejectOnce = (error: Error) => {
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            };
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
                res.setEncoding("utf8");
                res.on("data", (chunk: string) => {
                    data += chunk;
                    if (Buffer.byteLength(data) > 64 * 1024) {
                        req.destroy(new Error("Resposta do OAuth excede o limite permitido"));
                    }
                });
                res.on("error", rejectOnce);
                res.on("end", () => {
                    if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                        rejectOnce(new Error(this.getOAuthErrorMessage(data, res.statusCode)));
                        return;
                    }
                    resolveOnce(data);
                });
            });
            req.setTimeout(30_000, () => {
                req.destroy(new Error("A troca de tokens do Google excedeu o limite de 30 segundos."));
            });
            req.on("error", rejectOnce);
            req.write(body);
            req.end();
        });
    }

    /** Valida a resposta do endpoint de tokens antes de persistir qualquer dado. */
    private parseTokenResponse(data: string, requireRefreshToken: boolean): {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
    } {
        let response: unknown;
        try {
            response = JSON.parse(data);
        } catch {
            throw new Error("OAuth retornou uma resposta de token inválida");
        }
        if (!response || typeof response !== "object" || Array.isArray(response)) {
            throw new Error("OAuth retornou uma resposta de token inválida");
        }
        const tokenResponse = response as Record<string, unknown>;
        if (typeof tokenResponse.error === "string") {
            throw new Error(
                `Falha no OAuth: ${typeof tokenResponse.error_description === "string" ? tokenResponse.error_description : tokenResponse.error}`
            );
        }
        if (
            typeof tokenResponse.access_token !== "string" ||
            tokenResponse.access_token.length === 0 ||
            typeof tokenResponse.expires_in !== "number" ||
            !Number.isFinite(tokenResponse.expires_in) ||
            tokenResponse.expires_in <= 0 ||
            (requireRefreshToken && (typeof tokenResponse.refresh_token !== "string" || tokenResponse.refresh_token.length === 0))
        ) {
            throw new Error("OAuth retornou tokens incompletos ou inválidos");
        }
        return {
            access_token: tokenResponse.access_token,
            refresh_token: typeof tokenResponse.refresh_token === "string" ? tokenResponse.refresh_token : undefined,
            expires_in: tokenResponse.expires_in,
        };
    }

    /** Extrai uma causa segura e limitada da resposta de erro do OAuth. */
    private getOAuthErrorMessage(data: string, statusCode?: number): string {
        try {
            const parsed: unknown = JSON.parse(data);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const response = parsed as Record<string, unknown>;
                const code = typeof response.error === "string" ? response.error : undefined;
                const description = typeof response.error_description === "string"
                    ? response.error_description.slice(0, 240)
                    : undefined;
                if (code) {
                    return `Falha no OAuth: ${code}${description ? ` - ${description}` : ""}`;
                }
            }
        } catch {
            // Respostas não JSON não revelam uma causa segura para a pessoa usuária.
        }
        return `OAuth respondeu com HTTP ${statusCode || "desconhecido"}`;
    }

    /** Verifica o formato antes de usar dados vindos do SecretStorage. */
    private isValidTokenData(value: Partial<TokenData>): value is TokenData {
        return typeof value.access_token === "string" && value.access_token.length > 0
            && typeof value.refresh_token === "string" && value.refresh_token.length > 0
            && typeof value.expires_at === "number" && Number.isFinite(value.expires_at);
    }

    /** Página exibida enquanto o código OAuth é trocado pelos tokens. */
    private getPendingLoginHtml(): string {
        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concluindo sessão - Sync Antigravity</title>
<style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: start center;
        padding: clamp(112px, 21vh, 240px) 24px 24px;
        overflow: hidden;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: radial-gradient(circle at top, #30314a 0%, #1e1e2e 58%);
        color: #cdd6f4;
    }
    .success-message { position: relative; z-index: 1; text-align: center; }
    h1 { display: flex; align-items: center; justify-content: center; gap: 11px; margin: 0 0 12px; color: #a6e3a1; font-size: clamp(25px, 5vw, 34px); }
    .success-check { display: inline-grid; width: 1em; height: 1em; place-items: center; flex: 0 0 auto; border-radius: .2em; background: #51cf8a; color: #1e1e2e; font-family: system-ui, sans-serif; font-size: .58em; font-weight: 900; line-height: 1; }
    p { margin: 0; font-size: 17px; line-height: 1.55; }
    ${LOGIN_SUCCESS_EFFECT_STYLES}
</style>
</head>
<body>
    <main id="login-status" class="success-message">
        <h1>Concluindo início de sessão...</h1>
        <p>Validando a sessão no Antigravity.</p>
    </main>`;
    }

    /** Finaliza a página de retorno somente depois de salvar os tokens. */
    private getSuccessHtml(): string {
        const markup = `${LOGIN_SUCCESS_EFFECT_MARKUP}
    <main class="success-message">
        <h1><span class="success-check" aria-hidden="true">✓</span>Sessão iniciada com sucesso!</h1>
        <p>Você pode fechar esta aba e retornar ao Antigravity.</p>
    </main>`;
        return `<script>document.body.innerHTML = ${JSON.stringify(markup)}; setTimeout(() => window.close(), 3000);</script></body></html>`;
    }

    private getCompletionErrorHtml(error: string): string {
        const markup = `<main class="success-message">
        <h1 style="color:#f38ba8">Falha ao iniciar sessão</h1>
        <p>${this.escapeHtml(error)}</p>
        <p style="margin-top:12px">Feche esta aba e tente novamente no Antigravity.</p>
    </main>`;
        return `<script>document.body.innerHTML = ${JSON.stringify(markup)};</script></body></html>`;
    }

    /** Página HTML de erro */
    private getErrorHtml(error: string): string {
        return `<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:60px;background:#1e1e2e;color:#cdd6f4">
<h1 style="color:#f38ba8">❌ Falha ao iniciar sessão</h1>
<p>${this.escapeHtml(error)}</p>
<p>Feche esta aba e tente novamente no Antigravity.</p>
</body></html>`;
    }

    private escapeHtml(value: string): string {
        return value.replace(/[&<>'"]/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            "\"": "&quot;",
        })[character] || character);
    }
}
