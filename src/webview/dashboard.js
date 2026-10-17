// JavaScript do painel: executa dentro da Webview
// Sistema de modais, notificações e renderização orientada por estado

(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();
    const localizacao = globalThis.__SYNC_ANTIGRAVITY_L10N__;
    const { t, tp, comparador, formatadorDecimal } = globalThis.SyncAntigravityLocalizacao
        .criarLocalizador(localizacao);

    // === Elementos do DOM ===
    const loginSection = document.getElementById("login-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const headerUser = document.getElementById("header-user");
    const profilesList = document.getElementById("profiles-list");
    const profilesEmpty = document.getElementById("profiles-empty");
    const profileCount = document.getElementById("profile-count");
    const toastContainer = document.getElementById("toast-container");

    // === Botões ===
    const btnLogin = document.getElementById("btn-login");
    const btnLogout = document.getElementById("btn-logout");
    const btnCreateProfile = document.getElementById("btn-create-profile");
    const btnShowLogs = document.getElementById("btn-show-logs");
    const btnRefresh = document.getElementById("btn-refresh");

    // === Estado ===
    let currentState = null;
    let syncItemsConfig = [];

    // ========================================
    // SISTEMA DE MODAIS
    // ========================================

    /**
     * Show a confirm modal dialog
     * @param {object} opts - { title, message, icon, confirmLabel, cancelLabel, variant }
     * @returns {Promise<boolean>}
     */
    function showConfirm(opts) {
        return new Promise((resolve) => {
            const variant = opts.variant || "accent"; // "accent" | "danger"
            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header modal-header-${variant}">
                        <span class="codicon codicon-${opts.icon || "question"}"></span>
                        <span>${escapeHtml(opts.title || t("comum.confirmar"))}</span>
                    </div>
                    <div class="modal-body" style="white-space: pre-wrap;">${escapeHtml(opts.message || t("comum.temCerteza"))}</div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-modal="cancel">
                            ${escapeHtml(opts.cancelLabel || t("comum.cancelar"))}
                        </button>
                        <button class="btn ${variant === "danger" ? "btn-danger" : "btn-accent"}" data-modal="confirm">
                            ${escapeHtml(opts.confirmLabel || t("comum.confirmar"))}
                        </button>
                    </div>
                </div>
            `;

            function close(result) {
                overlay.classList.add("modal-out");
                setTimeout(() => { overlay.remove(); resolve(result); }, 200);
            }

            overlay.querySelector("[data-modal='confirm']").addEventListener("click", () => close(true));
            overlay.querySelector("[data-modal='cancel']").addEventListener("click", () => close(false));
            overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
            document.addEventListener("keydown", function onKey(e) {
                if (e.key === "Escape") { document.removeEventListener("keydown", onKey); close(false); }
                if (e.key === "Enter") { document.removeEventListener("keydown", onKey); close(true); }
            });

            document.body.appendChild(overlay);
            overlay.querySelector("[data-modal='confirm']").focus();
        });
    }

    /**
     * Show an input modal dialog
     * @param {object} opts - { title, message, icon, placeholder, confirmLabel, cancelLabel, validate }
     * @returns {Promise<string|null>} - input value or null if cancelled
     */
    function showInput(opts) {
        return new Promise((resolve) => {
            const hasSyncItems = opts.syncItems && opts.syncItems.length > 0;
            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header modal-header-accent">
                        <span class="codicon codicon-${opts.icon || "edit"}"></span>
                        <span>${escapeHtml(opts.title || t("comum.entrada"))}</span>
                    </div>
                    <div class="modal-body">
                        ${escapeHtml(opts.message || "")}
                        <input class="modal-input" type="text"
                               placeholder="${escapeAttr(opts.placeholder || "")}"
                               autocomplete="off" spellcheck="false" />
                        <div class="modal-input-error" id="modal-input-error"></div>
                        ${hasSyncItems ? `
                        <div class="sync-item-list">
                            <div class="sync-item-label">${escapeHtml(t("formulario.itensSincronizacao"))}</div>
                            ${opts.syncItems.map(item => `
                                <label class="sync-item">
                                    <input type="checkbox" value="${escapeAttr(item.key)}" ${item.enabled !== false ? 'checked' : ''} />
                                    <span class="codicon codicon-${item.icon}"></span>
                                    <span>${escapeHtml(item.label)}</span>
                                </label>
                            `).join('')}
                        </div>` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-modal="cancel">
                            ${escapeHtml(opts.cancelLabel || t("comum.cancelar"))}
                        </button>
                        <button class="btn btn-accent" data-modal="confirm">
                            ${escapeHtml(opts.confirmLabel || t("comum.criar"))}
                        </button>
                    </div>
                </div>
            `;

            const input = overlay.querySelector(".modal-input");
            const errorEl = overlay.querySelector("#modal-input-error");
            const confirmBtn = overlay.querySelector("[data-modal='confirm']");

            function validate() {
                const val = input.value.trim();
                if (opts.validate) {
                    const err = opts.validate(val);
                    errorEl.textContent = err || "";
                    return !err;
                }
                return val.length > 0;
            }

            function close(result) {
                overlay.classList.add("modal-out");
                setTimeout(() => { overlay.remove(); resolve(result); }, 200);
            }

            function submit() {
                if (!validate()) return;
                if (hasSyncItems) {
                    const checkedKeys = Array.from(overlay.querySelectorAll('.sync-item input[type="checkbox"]:checked'))
                        .map(cb => cb.value);
                    if (checkedKeys.length === 0) {
                        const listEl = overlay.querySelector('.sync-item-list');
                        let errEl = listEl.querySelector('.sync-item-error');
                        if (!errEl) {
                            errEl = document.createElement('div');
                            errEl.className = 'sync-item-error';
                            listEl.appendChild(errEl);
                        }
                        errEl.textContent = t("formulario.selecioneUmItem");
                        return;
                    }
                    close({ value: input.value.trim(), syncKeys: checkedKeys });
                } else {
                    close(input.value.trim());
                }
            }

            confirmBtn.addEventListener("click", submit);
            overlay.querySelector("[data-modal='cancel']").addEventListener("click", () => close(null));
            overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
            input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
            input.addEventListener("input", validate);
            document.addEventListener("keydown", function onKey(e) {
                if (e.key === "Escape") { document.removeEventListener("keydown", onKey); close(null); }
            });

            document.body.appendChild(overlay);
            input.focus();
        });
    }

    /**
     * Sync Select Modal - confirm with checkbox selection for push/pull
     * @param {object} opts - { title, message, icon, syncItems, confirmLabel, cancelLabel, variant }
     * @returns {Promise<string[]|null>} - selected sync keys or null if cancelled
     */
    function showSyncSelect(opts) {
        return new Promise((resolve) => {
            const variant = opts.variant || "accent";
            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header modal-header-${variant}">
                        <span class="codicon codicon-${opts.icon || "sync"}"></span>
                        <span>${escapeHtml(opts.title || t("comum.sincronizar"))}</span>
                    </div>
                    <div class="modal-body">
                        <p style="margin:0 0 4px">${escapeHtml(opts.message || "")}</p>
                        <div class="sync-item-list">
                            <div class="sync-item-label">${escapeHtml(t("formulario.itensSincronizacao"))}</div>
                            ${(opts.syncItems || []).map(item => `<label class="sync-item">
                                    <input type="checkbox" value="${escapeAttr(item.key)}" ${item.enabled !== false ? 'checked' : ''} />
                                    <span class="codicon codicon-${item.icon}"></span>
                                    <span>${escapeHtml(item.label)}</span>
                                </label>`).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-modal="cancel">
                            ${escapeHtml(opts.cancelLabel || t("comum.cancelar"))}
                        </button>
                        <button class="btn ${variant === "danger" ? "btn-danger" : "btn-accent"}" data-modal="confirm">
                            ${escapeHtml(opts.confirmLabel || t("comum.confirmar"))}
                        </button>
                    </div>
                </div>
            `;

            function close(result) {
                overlay.classList.add("modal-out");
                setTimeout(() => { overlay.remove(); resolve(result); }, 200);
            }

            function submit() {
                const checkedKeys = Array.from(overlay.querySelectorAll('.sync-item input[type="checkbox"]:checked'))
                    .map(cb => cb.value);
                if (checkedKeys.length === 0) {
                    const listEl = overlay.querySelector('.sync-item-list');
                    let errEl = listEl.querySelector('.sync-item-error');
                    if (!errEl) {
                        errEl = document.createElement('div');
                        errEl.className = 'sync-item-error';
                        listEl.appendChild(errEl);
                    }
                    errEl.textContent = t("formulario.selecioneUmItem");
                    return;
                }
                close(checkedKeys);
            }

            overlay.querySelector("[data-modal='confirm']").addEventListener("click", submit);
            overlay.querySelector("[data-modal='cancel']").addEventListener("click", () => close(null));
            overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
            document.addEventListener("keydown", function onKey(e) {
                if (e.key === "Escape") { document.removeEventListener("keydown", onKey); close(null); }
                if (e.key === "Enter") { document.removeEventListener("keydown", onKey); submit(); }
            });

            document.body.appendChild(overlay);
        });
    }

    function rotuloDoItemDeSincronizacao(chave) {
        return syncItemsConfig.find((item) => item.key === chave)?.label || chave;
    }

    function formatarBytes(bytes) {
        if (bytes < 1024) {
            return `${formatadorDecimal.format(bytes)} B`;
        }
        return `${formatadorDecimal.format(bytes / 1024)} KiB`;
    }

    function formatarDetalheDaPrevia(item) {
        const detalhe = item?.detalhe;
        if (!detalhe || typeof detalhe.tipo !== "string") {
            return t("comum.validado");
        }
        switch (detalhe.tipo) {
            case "ausente":
                return t("previa.detalheAusente");
            case "bytes":
                return t("previa.detalheBytes", { tamanho: formatarBytes(Number(detalhe.bytes) || 0) });
            case "extensoes":
                return tp(
                    "previa.detalheExtensao",
                    "previa.detalheExtensoes",
                    Number(detalhe.quantidade) || 0
                );
            case "snippets":
                return tp(
                    "previa.detalheSnippet",
                    "previa.detalheSnippets",
                    Number(detalhe.quantidadeArquivos) || 0,
                    {
                    tamanho: formatarBytes(Number(detalhe.totalBytes) || 0),
                    }
                );
            case "layout": {
                const globais = Number(detalhe.quantidadeGlobal) || 0;
                const workspaces = Number(detalhe.quantidadeWorkspaces) || 0;
                return `${tp("previa.detalheLayoutGlobal", "previa.detalheLayoutGlobais", globais)}, ${tp("previa.detalheLayoutWorkspace", "previa.detalheLayoutWorkspaces", workspaces)}`;
            }
            default:
                return t("comum.validado");
        }
    }

    /** Mostra todos os itens validados antes de qualquer restauração local. */
    function showProfileRestorePreview(profileName, preview) {
        return new Promise((resolve) => {
            const items = Array.isArray(preview.items) ? preview.items : [];
            const layoutPreview = preview.layout || null;
            const extensionPreview = preview.extensions || null;
            const workspaces = Array.isArray(layoutPreview?.workspaces) ? layoutPreview.workspaces : [];
            const toInstall = Array.isArray(extensionPreview?.toInstall) ? extensionPreview.toInstall : [];
            const toDelete = Array.isArray(extensionPreview?.toDelete) ? extensionPreview.toDelete : [];
            const profileExtensions = Array.isArray(extensionPreview?.profileExtensions) ? extensionPreview.profileExtensions : [];
            const toInstallIds = new Set(toInstall.map((extension) => (extension.id || "").toLowerCase()));

            const itemList = items.length > 0
                ? `<ul class="profile-preview-items">${items.map((item) => {
                    if (item.key === "extensions" && extensionPreview) {
                        return `
                            <li class="profile-preview-item-interactive" data-action="toggle-extensions" title="${escapeAttr(t("previa.alternarExtensoes"))}">
                                <span><span class="codicon codicon-extensions"></span> ${escapeHtml(rotuloDoItemDeSincronizacao(item.key))}</span>
                                <span class="preview-item-action">
                                    <span>${escapeHtml(formatarDetalheDaPrevia(item))}</span>
                                    <span class="codicon codicon-chevron-right preview-item-chevron"></span>
                                </span>
                            </li>
                        `;
                    }
                    return `<li><span>${escapeHtml(rotuloDoItemDeSincronizacao(item.key) || t("comum.item"))}</span><span>${escapeHtml(formatarDetalheDaPrevia(item))}</span></li>`;
                }).join('')}</ul>`
                : `<p class="layout-preview-muted">${escapeHtml(t("previa.nenhumItem"))}</p>`;

            const workspaceOptions = workspaces.length === 0
                ? `<p class="layout-preview-muted">${escapeHtml(t("previa.nenhumLayoutWorkspace"))}</p>`
                : workspaces.map((item, index) => `
                    <label class="sync-item layout-workspace-option">
                        <input type="radio" name="layout-workspace" value="${escapeAttr(item.sourceId)}" ${workspaces.length === 1 && index === 0 ? "checked" : ""} />
                        <span class="codicon codicon-folder"></span>
                        <span>${escapeHtml(item.label)} (${escapeHtml(tp("previa.quantidadeItem", "previa.quantidadeItens", Number(item.entryCount) || 0))})</span>
                    </label>
                `).join('');
            const globalKeys = Array.isArray(layoutPreview?.globalKeys) && layoutPreview.globalKeys.length > 0
                ? `<ul class="layout-preview-keys">${layoutPreview.globalKeys.map((key) => `<li><code>${escapeHtml(key)}</code></li>`).join('')}</ul>`
                : `<p class="layout-preview-muted">${escapeHtml(t("previa.nenhumaChaveGlobal"))}</p>`;
            const workspaceHint = workspaces.length > 1
                ? `<p class="layout-preview-muted">${escapeHtml(t("previa.escolhaWorkspace"))}</p>`
                : '';
            const layoutSection = layoutPreview ? `
                <div class="layout-preview-section">
                    <div class="sync-item-label">${escapeHtml(tp("previa.layoutGlobalItem", "previa.layoutGlobalItens", Number(layoutPreview.globalEntryCount) || 0))}</div>
                    ${globalKeys}
                </div>
                <div class="layout-preview-section">
                    <div class="sync-item-label">${escapeHtml(t("previa.layoutWorkspace"))}</div>
                    ${workspaceHint}
                    ${workspaceOptions}
                </div>
            ` : '';

            const renderExtensionRow = (extension, tagType, tagText) => `
                <li class="preview-extension-row">
                    <span class="codicon codicon-package"></span>
                    <div class="preview-extension-info">
                        <span class="preview-extension-name" title="${escapeAttr(extension.displayName || extension.id)}">${escapeHtml(extension.displayName || extension.id)}</span>
                        <code class="preview-extension-id">${escapeHtml(extension.id)}</code>
                    </div>
                    <span class="preview-tag preview-tag-${tagType}">${escapeHtml(tagText)}</span>
                </li>
            `;

            let extensionSection = '';
            if (extensionPreview) {
                const totalExtensions = profileExtensions.length;

                // Monta lista unificada com prioridade: 1: A instalar, 2: A remover, 3: Presentes
                const allExtensionRows = [];

                toInstall.forEach((extension) => {
                    allExtensionRows.push({
                        ...extension,
                        tagType: "install",
                        tagText: t("previa.instalar"),
                        priority: 1,
                    });
                });

                toDelete.forEach((extension) => {
                    allExtensionRows.push({
                        ...extension,
                        tagType: "delete",
                        tagText: t("previa.remover"),
                        priority: 2,
                    });
                });

                profileExtensions.forEach((extension) => {
                    const lowerId = (extension.id || "").toLowerCase();
                    if (!toInstallIds.has(lowerId)) {
                        allExtensionRows.push({
                            ...extension,
                            tagType: "present",
                            tagText: t("previa.presente"),
                            priority: 3,
                        });
                    }
                });

                allExtensionRows.sort((first, second) => {
                    if (first.priority !== second.priority) {
                        return first.priority - second.priority;
                    }
                    return comparador.compare(first.displayName || first.id, second.displayName || second.id);
                });

                const renderedRows = allExtensionRows.length > 0
                    ? allExtensionRows.map((extension) => renderExtensionRow(extension, extension.tagType, extension.tagText)).join('')
                    : `<li class="layout-preview-muted" style="padding: 8px;">${escapeHtml(t("previa.nenhumaExtensao"))}</li>`;

                let statusBadge = `<span class="preview-tag preview-tag-present">${escapeHtml(t("previa.todasInstaladas"))}</span>`;
                if (toInstall.length > 0 || toDelete.length > 0) {
                    const badgeParts = [];
                    if (toInstall.length > 0) {
                        badgeParts.push(`<span class="preview-tag preview-tag-install">${escapeHtml(t("previa.paraInstalar", { quantidade: toInstall.length }))}</span>`);
                    }
                    if (toDelete.length > 0) {
                        badgeParts.push(`<span class="preview-tag preview-tag-delete">${escapeHtml(t("previa.paraRemover", { quantidade: toDelete.length }))}</span>`);
                    }
                    statusBadge = badgeParts.join(' ');
                }

                extensionSection = `
                    <div class="layout-preview-section" id="preview-extensions-section">
                        <div class="sync-item-label">${escapeHtml(t("previa.extensoesQuantidade", { quantidade: totalExtensions }))}</div>
                        <details class="preview-accordion" id="preview-extensions-accordion" open>
                            <summary class="preview-accordion-summary">
                                <div class="preview-summary-left">
                                    <span class="codicon codicon-extensions"></span>
                                    <span>${escapeHtml(t("previa.listaExtensoes"))}</span>
                                </div>
                                <div class="preview-summary-right" style="display: flex; align-items: center; gap: 6px;">
                                    ${statusBadge}
                                </div>
                            </summary>
                            <div class="preview-accordion-content">
                                <ul class="profile-preview-extension-scroll">${renderedRows}</ul>
                            </div>
                        </details>
                        <p class="layout-preview-muted" style="margin-top: 8px;">${escapeHtml(t("previa.confirmacaoExtensoes"))}</p>
                    </div>
                `;
            }

            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.innerHTML = `
                <div class="modal layout-preview-modal">
                    <div class="modal-header modal-header-accent">
                        <span class="codicon codicon-eye"></span>
                        <span>${escapeHtml(t("previa.titulo"))}</span>
                    </div>
                    <div class="modal-body">
                        <p>${escapeHtml(t("previa.descricao", { nome: profileName }))}</p>
                        <div class="layout-preview-section">
                            <div class="sync-item-label">${escapeHtml(t("previa.itensRestaurados"))}</div>
                            ${itemList}
                        </div>
                        ${layoutSection}
                        ${extensionSection}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-modal="cancel">${escapeHtml(t("comum.cancelar"))}</button>
                        <button class="btn btn-accent" data-modal="confirm">${escapeHtml(t("previa.aplicarPerfil"))}</button>
                    </div>
                </div>
            `;

            function close(result) {
                overlay.classList.add("modal-out");
                setTimeout(() => { overlay.remove(); resolve(result); }, 200);
            }

            const extToggle = overlay.querySelector("[data-action='toggle-extensions']");
            if (extToggle) {
                extToggle.addEventListener("click", () => {
                    const accordion = overlay.querySelector("#preview-extensions-accordion");
                    if (accordion) {
                        accordion.open = !accordion.open;
                        accordion.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                });
            }

            overlay.querySelector("[data-modal='confirm']").addEventListener("click", () => {
                const selected = overlay.querySelector("input[name='layout-workspace']:checked");
                if (layoutPreview && workspaces.length > 1 && !selected) {
                    showToast("error", t("previa.selecioneWorkspace"));
                    return;
                }
                close({ workspaceLayoutId: selected?.value });
            });
            overlay.querySelector("[data-modal='cancel']").addEventListener("click", () => close(null));
            overlay.addEventListener("click", (event) => { if (event.target === overlay) close(null); });
            document.body.appendChild(overlay);
            overlay.querySelector("[data-modal='confirm']").focus();
        });
    }

    // ========================================
    // SISTEMA DE NOTIFICAÇÕES (aprimorado)
    // ========================================

    function showToast(level, message, duration) {
        duration = duration || 4000;
        const toast = document.createElement("div");
        toast.className = `toast toast-${level}`;

        const iconMap = { success: "check", error: "error", info: "info" };
        const icon = iconMap[level] || "info";

        toast.innerHTML = `
            <div class="toast-content">
                <span class="codicon codicon-${icon}"></span>
                <span>${escapeHtml(message)}</span>
            </div>
            <button class="toast-close" title="${escapeAttr(t("comum.dispensar"))}" aria-label="${escapeAttr(t("comum.dispensar"))}">
                <span class="codicon codicon-close"></span>
            </button>
            <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
        `;

        // Botão de fechar
        toast.querySelector(".toast-close").addEventListener("click", () => dismissToast(toast));

        toastContainer.appendChild(toast);

        // Dispensa automática
        const timer = setTimeout(() => dismissToast(toast), duration);
        toast._timer = timer;
    }

    function dismissToast(toast) {
        if (toast._dismissed) return;
        toast._dismissed = true;
        clearTimeout(toast._timer);
        toast.classList.add("toast-out");
        setTimeout(() => toast.remove(), 300);
    }

    // ========================================
    // OUVINTES DE EVENTOS
    // ========================================

    btnLogin.addEventListener("click", () => {
        vscode.postMessage({ command: "login" });
    });

    btnLogout.addEventListener("click", async () => {
        const confirmed = await showConfirm({
            title: t("pagina.encerrarSessao"),
            message: t("autenticacao.confirmarSaida"),
            icon: "sign-out",
            confirmLabel: t("pagina.encerrarSessao"),
            variant: "danger",
        });
        if (confirmed) {
            vscode.postMessage({ command: "logout" });
        }
    });

    btnCreateProfile.addEventListener("click", async () => {
        const result = await showInput({
            title: t("pagina.criarPerfil"),
            message: t("formulario.informarNomePerfil"),
            icon: "add",
            placeholder: t("formulario.exemploNomePerfil"),
            confirmLabel: t("comum.criar"),
            syncItems: syncItemsConfig,
            validate: (val) => {
                if (!val) return t("formulario.nomeObrigatorio");
                if (!/^[a-zA-Z0-9_-]+$/.test(val)) return t("formulario.nomeCaracteres");
                return null;
            },
        });
        if (result && result.value) {
            vscode.postMessage({ command: "createProfile", name: result.value, syncKeys: result.syncKeys });
        }
    });

    btnShowLogs.addEventListener("click", () => {
        vscode.postMessage({ command: "showLogs" });
    });

    btnRefresh.addEventListener("click", () => {
        btnRefresh.classList.add("spinning");
        vscode.postMessage({ command: "refresh" });
    });

    // === Ações do perfil (delegação de eventos) ===
    profilesList.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;
        const fileName = btn.dataset.file;
        const profileName = fileName.replace(".json", "");

        switch (action) {
            case "pull": {
                // Mostra apenas os itens presentes em meta.syncKeys do perfil
                const profile = currentState?.profiles?.find(p => p.fileName === fileName);
                const metaKeys = profile?.syncKeys;
                const items = metaKeys
                    ? syncItemsConfig.filter(i => metaKeys.includes(i.key))
                    : syncItemsConfig;
                const syncKeys = await showSyncSelect({
                    title: t("perfil.aplicarTitulo"),
                    message: t("perfil.aplicarPergunta", { nome: profileName }),
                    icon: "cloud-download",
                    syncItems: items,
                    confirmLabel: t("comum.aplicar"),
                });
                if (syncKeys) {
                    vscode.postMessage({ command: "pullProfile", fileName, syncKeys });
                }
                break;
            }
            case "push": {
                // Marca previamente as caixas que correspondem a meta.syncKeys
                const profile = currentState?.profiles?.find(p => p.fileName === fileName);
                const metaKeys = profile?.syncKeys;
                const items = syncItemsConfig.map(i => ({
                    ...i,
                    enabled: metaKeys ? metaKeys.includes(i.key) : i.enabled,
                }));
                const syncKeys = await showSyncSelect({
                    title: t("perfil.atualizarTitulo"),
                    message: t("perfil.atualizarPergunta", { nome: profileName }),
                    icon: "cloud-upload",
                    syncItems: items,
                    confirmLabel: t("comum.atualizar"),
                });
                if (syncKeys) {
                    vscode.postMessage({ command: "updateProfile", fileName, syncKeys });
                }
                break;
            }
            case "delete": {
                const confirmed = await showConfirm({
                    title: t("perfil.excluirTitulo"),
                    message: t("perfil.excluirPergunta", { nome: profileName }),
                    icon: "trash",
                    confirmLabel: t("comum.excluir"),
                    variant: "danger",
                });
                if (confirmed) {
                    vscode.postMessage({ command: "deleteProfile", fileName });
                }
                break;
            }
        }
    });

    // ========================================
    // EXPLORADOR DE DADOS DO APLICATIVO
    // ========================================

    const appdataSection = document.getElementById("appdata-section");
    const appdataList = document.getElementById("appdata-list");
    const appdataEmpty = document.getElementById("appdata-empty");
    const appdataBreadcrumb = document.getElementById("appdata-breadcrumb");
    const appdataTableWrapper = document.getElementById("appdata-table-wrapper");
    const btnRefreshAppdata = document.getElementById("btn-refresh-appdata");
    const btnBackAppdata = document.getElementById("btn-back-appdata");

    // Estado da navegação entre pastas
    let currentFolderId = null;
    let folderStack = []; // [{ id, name }, ...]
    let previewPending = false; // Prevent double preview

    // Estado da paginação
    let pageTokenStack = []; // previous page tokens
    let currentPageToken = null;
    let nextPageToken = null;
    let currentPage = 1;

    function fetchAppDataFiles(folderId, folderName, pageToken) {
        // Exibe o estado de carregamento
        btnRefreshAppdata.classList.add("spinning");
        appdataEmpty.style.display = "none";
        appdataTableWrapper.style.display = "none";
        // Exibe o espaço reservado de carregamento
        let loadingEl = appdataTableWrapper.parentNode.querySelector(".appdata-loading");
        if (!loadingEl) {
            loadingEl = document.createElement("div");
            loadingEl.className = "appdata-loading profiles-loading";
            loadingEl.innerHTML = `<span class="spinner"></span><span>${escapeHtml(t("explorador.carregandoArquivos"))}</span>`;
            appdataTableWrapper.parentNode.insertBefore(loadingEl, appdataTableWrapper);
        }
        loadingEl.style.display = "";
        vscode.postMessage({ command: "listAppData", folderId, folderName, pageToken: pageToken || undefined });
    }

    function navigateToFolder(folderId, folderName) {
        if (currentFolderId) {
            // Find existing entry or push current
            const existingIdx = folderStack.findIndex((f) => f.id === currentFolderId);
            if (existingIdx === -1) {
                // Don't push if we're navigating from breadcrumb
            }
        }
        folderStack.push({ id: currentFolderId, name: getCurrentFolderName() });
        currentFolderId = folderId;
        btnBackAppdata.style.display = "";
        // Reset pagination on folder change
        pageTokenStack = []; currentPageToken = null; nextPageToken = null; currentPage = 1;
        fetchAppDataFiles(folderId, folderName, null);
    }

    function navigateBack() {
        if (folderStack.length === 0) return;
        const prev = folderStack.pop();
        currentFolderId = prev.id;
        btnBackAppdata.style.display = folderStack.length > 0 ? "" : "none";
        pageTokenStack = []; currentPageToken = null; nextPageToken = null; currentPage = 1;
        fetchAppDataFiles(currentFolderId, prev.name, null);
    }

    function navigateToBreadcrumb(index) {
        // index 0 = Root, 1 = first folder, etc.
        if (index === 0) {
            currentFolderId = null;
            folderStack = [];
            btnBackAppdata.style.display = "none";
            pageTokenStack = []; currentPageToken = null; nextPageToken = null; currentPage = 1;
            fetchAppDataFiles(null, t("pagina.raiz"), null);
        } else {
            const target = folderStack[index];
            if (!target) return;
            currentFolderId = target.id;
            folderStack = folderStack.slice(0, index);
            btnBackAppdata.style.display = folderStack.length > 0 ? "" : "none";
            pageTokenStack = []; currentPageToken = null; nextPageToken = null; currentPage = 1;
            fetchAppDataFiles(currentFolderId, target.name, null);
        }
    }

    function getCurrentFolderName() {
        if (!currentFolderId) return t("pagina.raiz");
        if (folderStack.length > 0) {
            const last = folderStack[folderStack.length - 1];
            // The current name is actually what we navigated into
            return t("explorador.pasta");
        }
        return t("pagina.raiz");
    }

    // Render breadcrumb
    function renderBreadcrumb(currentName) {
        let html = `<span class="breadcrumb-item" data-bc-index="0">${escapeHtml(t("pagina.raiz"))}</span>`;
        folderStack.forEach((f, i) => {
            if (f.id !== null) {
                html += `<span class="breadcrumb-sep codicon codicon-chevron-right"></span>`;
                html += `<span class="breadcrumb-item" data-bc-index="${i + 1}">${escapeHtml(f.name || t("explorador.pasta"))}</span>`;
            }
        });
        if (currentFolderId) {
            html += `<span class="breadcrumb-sep codicon codicon-chevron-right"></span>`;
            html += `<span class="breadcrumb-item active">${escapeHtml(currentName)}</span>`;
        } else {
            // Root is active
            const rootSpan = html.split("data-bc-index=\"0\">")[0];
            html = `<span class="breadcrumb-item active" data-bc-index="0">${escapeHtml(t("pagina.raiz"))}</span>`;
            folderStack.forEach((f, i) => {
                if (f.id !== null) {
                    html += `<span class="breadcrumb-sep codicon codicon-chevron-right"></span>`;
                    html += `<span class="breadcrumb-item" data-bc-index="${i + 1}">${escapeHtml(f.name || t("explorador.pasta"))}</span>`;
                }
            });
        }
        appdataBreadcrumb.innerHTML = html;
    }

    // MimeType → codicon
    function mimeIcon(mime) {
        if (mime === "application/vnd.google-apps.folder") return "folder";
        if (mime === "application/json" || (mime && mime.includes("json"))) return "json";
        if (mime && mime.startsWith("text/")) return "file-text";
        return "file";
    }

    // MimeType → human-readable label
    function mimeLabel(mime) {
        if (mime === "application/vnd.google-apps.folder") return t("explorador.pasta");
        if (mime === "application/json" || (mime && mime.includes("json"))) return "JSON";
        if (mime && mime.startsWith("text/")) return t("explorador.texto");
        if (mime && mime.startsWith("image/")) return t("explorador.imagem");
        return t("explorador.arquivo");
    }

    // MimeType → badge class
    function mimeBadgeClass(mime) {
        if (mime === "application/vnd.google-apps.folder") return "type-badge-folder";
        if (mime === "application/json" || (mime && mime.includes("json"))) return "type-badge-json";
        if (mime && mime.startsWith("text/")) return "type-badge-text";
        return "type-badge-default";
    }

    // Format file size
    function formatSize(bytes) {
        if (!bytes) return "-";
        const num = parseInt(bytes, 10);
        if (isNaN(num)) return "-";
        if (num < 1024) return `${num} B`;
        if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
        return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Check if file is previewable
    function isPreviewable(mime) {
        return mime !== "application/vnd.google-apps.folder" &&
               !mime.startsWith("image/") &&
               !mime.startsWith("video/") &&
               !mime.startsWith("audio/");
    }

    // Render app data files table
    function renderAppDataFiles(files, folderName, newNextPageToken) {
        btnRefreshAppdata.classList.remove("spinning");
        // Hide loading placeholder
        const loadingEl = appdataTableWrapper.parentNode.querySelector(".appdata-loading");
        if (loadingEl) { loadingEl.style.display = "none"; }
        nextPageToken = newNextPageToken || null;
        renderBreadcrumb(folderName);

        // Google Drive API may return empty page even with valid nextPageToken.
        // Auto-go back if empty and not on page 1.
        if (files.length === 0 && currentPage > 1) {
            nextPageToken = null;
            currentPage--;
            const prevToken = pageTokenStack.pop();
            currentPageToken = prevToken || null;
            fetchAppDataFiles(currentFolderId, null, currentPageToken);
            return;
        }

        if (files.length === 0) {
            appdataEmpty.style.display = "";
            appdataTableWrapper.style.display = "none";
            return;
        }

        appdataEmpty.style.display = "none";
        appdataTableWrapper.style.display = "";

        // Sort: folders first, then by name
        const sorted = [...files].sort((a, b) => {
            const aFolder = a.mimeType === "application/vnd.google-apps.folder" ? 0 : 1;
            const bFolder = b.mimeType === "application/vnd.google-apps.folder" ? 0 : 1;
            if (aFolder !== bFolder) return aFolder - bFolder;
            return comparador.compare(a.name, b.name);
        });

        appdataList.innerHTML = sorted.map((f) => {
            const isFolder = f.mimeType === "application/vnd.google-apps.folder";
            const modified = f.modifiedTime ? formatDate(f.modifiedTime) : "-";
            const icon = mimeIcon(f.mimeType);
            const label = mimeLabel(f.mimeType);
            const badgeClass = mimeBadgeClass(f.mimeType);

            return `
                <tr class="appdata-row ${isFolder ? "appdata-row-folder" : ""}"
                    ${isFolder ? `data-folder-id="${escapeAttr(f.id)}" data-folder-name="${escapeAttr(f.name)}"` : ""}>
                    <td class="appdata-name">
                        <span class="codicon codicon-${icon}"></span>
                        ${escapeHtml(f.name)}
                    </td>
                    <td><span class="type-badge ${badgeClass}">${escapeHtml(label)}</span></td>
                    <td class="appdata-size">${isFolder ? "-" : formatSize(f.size)}</td>
                    <td class="appdata-date">${modified}</td>
                    <td class="appdata-actions">
                        ${!isFolder && isPreviewable(f.mimeType) ? `
                            <button class="btn-icon" data-preview-id="${escapeAttr(f.id)}" data-preview-name="${escapeAttr(f.name)}" title="${escapeAttr(t("explorador.visualizar"))}" aria-label="${escapeAttr(t("explorador.visualizar"))}">
                                <span class="codicon codicon-eye"></span>
                            </button>
                        ` : ""}
                    </td>
                </tr>
            `;
        }).join("");

        // Render pagination bar
        renderPagination();
    }

    // Preview modal
    function showFilePreview(fileName, content) {
        previewPending = false;
        // Close existing preview modal if any
        const existing = document.querySelector(".file-preview-modal");
        if (existing) { existing.closest(".modal-overlay")?.remove(); }
        let formatted = content;
        try {
            const parsed = JSON.parse(content);
            formatted = JSON.stringify(parsed, null, 2);
        } catch { /* not JSON, keep as-is */ }

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal file-preview-modal">
                <div class="modal-header modal-header-accent">
                    <span class="codicon codicon-eye"></span>
                    <span>${escapeHtml(fileName)}</span>
                </div>
                <div class="modal-body file-preview-body">
                    <pre class="file-preview-content"><code>${escapeHtml(formatted)}</code></pre>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-modal="cancel">${escapeHtml(t("comum.fechar"))}</button>
                </div>
            </div>
        `;

        function close() {
            overlay.classList.add("modal-out");
            setTimeout(() => overlay.remove(), 200);
        }

        overlay.querySelector("[data-modal='cancel']").addEventListener("click", close);

        document.body.appendChild(overlay);
    }

    // Render pagination controls
    function renderPagination() {
        let paginationBar = document.getElementById("appdata-pagination");
        if (!paginationBar) {
            paginationBar = document.createElement("div");
            paginationBar.id = "appdata-pagination";
            paginationBar.className = "pagination-bar";
            appdataTableWrapper.parentNode.appendChild(paginationBar);
        }

        // Hide if first page and no next
        if (currentPage === 1 && !nextPageToken) {
            paginationBar.style.display = "none";
            return;
        }

        paginationBar.style.display = "";
        const hasPrev = currentPage > 1;

        paginationBar.innerHTML = `
            <button class="btn btn-secondary btn-sm" id="btn-page-prev" ${!hasPrev ? "disabled" : ""}>
                <span class="codicon codicon-chevron-left"></span> ${escapeHtml(t("comum.anterior"))}
            </button>
            <span class="page-indicator">${escapeHtml(t("explorador.pagina", { pagina: currentPage }))}</span>
            <button class="btn btn-secondary btn-sm" id="btn-page-next" ${!nextPageToken ? "disabled" : ""}>
                ${escapeHtml(t("comum.proxima"))} <span class="codicon codicon-chevron-right"></span>
            </button>
        `;

        document.getElementById("btn-page-prev")?.addEventListener("click", () => {
            if (currentPage <= 1) return;
            currentPage--;
            const prevToken = pageTokenStack.pop();
            currentPageToken = prevToken || null;
            fetchAppDataFiles(currentFolderId, null, currentPageToken);
        });

        document.getElementById("btn-page-next")?.addEventListener("click", () => {
            if (!nextPageToken) return;
            pageTokenStack.push(currentPageToken);
            currentPageToken = nextPageToken;
            currentPage++;
            fetchAppDataFiles(currentFolderId, null, currentPageToken);
        });
    }

    // Event: Refresh app data
    btnRefreshAppdata.addEventListener("click", () => {
        btnRefreshAppdata.classList.add("spinning");
        pageTokenStack = []; currentPageToken = null; nextPageToken = null; currentPage = 1;
        fetchAppDataFiles(currentFolderId, null, null);
        setTimeout(() => btnRefreshAppdata.classList.remove("spinning"), 800);
    });

    // Event: Back button
    btnBackAppdata.addEventListener("click", () => {
        navigateBack();
    });

    // Event: Breadcrumb click
    appdataBreadcrumb.addEventListener("click", (e) => {
        const item = e.target.closest("[data-bc-index]");
        if (!item || item.classList.contains("active")) return;
        const idx = parseInt(item.dataset.bcIndex, 10);
        navigateToBreadcrumb(idx);
    });

    // Event: Table delegation (dblclick folder, click preview)
    appdataList.addEventListener("dblclick", (e) => {
        const row = e.target.closest("[data-folder-id]");
        if (row) {
            navigateToFolder(row.dataset.folderId, row.dataset.folderName);
        }
    });

    appdataList.addEventListener("click", (e) => {
        const previewBtn = e.target.closest("[data-preview-id]");
        if (previewBtn && !previewPending) {
            previewPending = true;
            vscode.postMessage({
                command: "previewFile",
                fileId: previewBtn.dataset.previewId,
                fileName: previewBtn.dataset.previewName,
            });
        }
    });

    // ========================================
    // TRATADOR DE MENSAGENS
    // ========================================
    // MODAL DE PROGRESSO DA SINCRONIZAÇÃO
    // ========================================

    let syncModal = null;
    let syncSteps = [];
    let syncTotal = 0;
    let syncCompleted = false;

    /** Show sync progress modal */
    function showSyncProgress(title) {
        closeSyncProgress();
        syncSteps = [];
        syncTotal = 0;
        syncCompleted = false;

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay sync-progress-overlay";
        overlay.innerHTML = `
            <div class="modal sync-progress-modal">
                <div class="modal-header">
                    <div class="modal-icon codicon codicon-sync sync-spin"></div>
                    <h3 class="modal-title">${escapeHtml(title)}</h3>
                </div>
                <div class="sync-steps" id="sync-steps-container"></div>
                <div class="sync-progress-bar-container">
                    <div class="sync-progress-bar" id="sync-progress-bar"></div>
                </div>
                <div class="sync-progress-text" id="sync-progress-text">${escapeHtml(t("progresso.preparando"))}</div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener("click", (e) => {
            // Permite fechar somente quando a sincronização for concluída
            if (e.target === overlay && syncCompleted) { closeSyncProgress(); }
        });
        requestAnimationFrame(() => overlay.classList.add("visible"));
        syncModal = overlay;
    }

    /** Update a sync step */
    function updateSyncStep(step, current, total, status) {
        if (!syncModal) { return; }
        syncTotal = total;

        // Ensure step exists
        if (!syncSteps.find(s => s.name === step)) {
            syncSteps.push({ name: step, status: "pending" });
        }

        // Update status
        const s = syncSteps.find(s => s.name === step);
        if (s) { s.status = status; }

        renderSyncSteps();
    }

    /** Render sync steps UI */
    function renderSyncSteps() {
        if (!syncModal) { return; }

        const container = syncModal.querySelector("#sync-steps-container");
        if (container) {
            container.innerHTML = syncSteps.map(s => {
                const icon = s.status === "done" ? "codicon-check"
                    : s.status === "active" ? "codicon-loading sync-spin"
                    : "codicon-circle-outline";
                const cls = `sync-step sync-step-${s.status}`;
                return `<div class="${cls}">
                    <span class="codicon ${icon}"></span>
                    <span>${escapeHtml(s.name)}</span>
                </div>`;
            }).join("");
        }

        // Progress bar
        const done = syncSteps.filter(s => s.status === "done").length;
        const total = syncTotal || syncSteps.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const bar = syncModal.querySelector("#sync-progress-bar");
        if (bar) { bar.style.width = `${pct}%`; }

        const text = syncModal.querySelector("#sync-progress-text");
        if (text) { text.textContent = t("progresso.concluidos", { concluidos: done, total }); }
    }

    /** Mark sync as complete - show done state */
    function markSyncDone() {
        syncCompleted = true;
        if (!syncModal) { return; }

        // Change header icon to check
        const icon = syncModal.querySelector(".modal-icon");
        if (icon) {
            icon.className = "modal-icon codicon codicon-check";
            icon.style.color = "var(--ag-accent)";
        }

        // Auto-close after 800ms
        setTimeout(() => closeSyncProgress(), 800);
    }

    /** Close sync progress modal */
    function closeSyncProgress() {
        if (syncModal) {
            const el = syncModal;
            el.classList.remove("visible");
            setTimeout(() => el.remove(), 200);
            syncModal = null;
            syncSteps = [];
            syncCompleted = false;
        }
    }

    // ========================================
    // MESSAGE HANDLER
    // ========================================

    window.addEventListener("message", (event) => {
        const msg = event.data;
        switch (msg.type) {
            case "state":
                currentState = msg.data;
                renderState(msg.data);
                break;
            case "loading":
                handleLoading(msg.action, msg.loading);
                break;
            case "toast":
                showToast(msg.level, msg.message);
                break;
            case "syncStart":
                showSyncProgress(msg.title);
                break;
            case "syncProgress":
                updateSyncStep(msg.step, msg.current, msg.total, msg.status);
                break;
            case "syncDone":
                markSyncDone();
                break;
            case "askExtensionSync": {
                const installEntries = (msg.toInstall || []);
                const deleteEntries = (msg.toDelete || []);
                const extensionLabel = (extension) => extension.displayName || t("extensoes.semNome");
                const installList = installEntries.map((extension) => extension.id);
                const deleteList = deleteEntries.map((extension) => extension.id);
                let details = `${t("extensoes.resumo", { instalar: installList.length, remover: deleteList.length })}\n\n`;
                if (installList.length > 0) {
                    details += `📥 ${t("extensoes.instalarLista")}\n${installEntries.map((extension) => `  • ${extensionLabel(extension)}`).join("\n")}\n\n`;
                }
                if (deleteList.length > 0) {
                    details += `🗑️ ${t("extensoes.removerLista")}\n${deleteEntries.map((extension) => `  • ${extensionLabel(extension)}`).join("\n")}`;
                }
                showConfirm({
                    title: t("extensoes.titulo"),
                    message: details,
                    icon: "extensions",
                    confirmLabel: t("comum.aplicar"),
                    cancelLabel: t("extensoes.pular"),
                    variant: "accent",
                }).then((confirmed) => {
                    if (confirmed) {
                        vscode.postMessage({
                            command: "applyExtensionSync",
                            toInstall: installList,
                            toDelete: deleteList,
                            layoutWillApplyAfterExit: Boolean(msg.layoutWillApplyAfterExit),
                        });
                    } else {
                        vscode.postMessage({
                            command: "requestRestart",
                            layoutWillApplyAfterExit: Boolean(msg.layoutWillApplyAfterExit),
                        });
                    }
                });
                break;
            }
            case "askRestart":
                showConfirm({
                    title: t("reinicializacao.titulo"),
                    message: msg.layoutWillApplyAfterExit
                        ? t("reinicializacao.comLayout")
                        : t("reinicializacao.semLayout"),
                    icon: "refresh",
                    confirmLabel: t("reinicializacao.agora"),
                    cancelLabel: t("comum.maisTarde"),
                    variant: "accent",
                }).then((confirmed) => {
                    if (confirmed) {
                        vscode.postMessage({ command: "reloadWindow" });
                    }
                });
                break;
            case "appDataFiles":
                renderAppDataFiles(msg.files || [], msg.folderName || t("pagina.raiz"), msg.nextPageToken);
                break;
            case "filePreview":
                showFilePreview(msg.fileName, msg.content);
                break;
            case "profileRestorePreview":
                showProfileRestorePreview(msg.profileName, msg.preview || {}).then((selection) => {
                    if (selection) {
                        vscode.postMessage({
                            command: "confirmProfileRestore",
                            restoreId: msg.restoreId,
                            workspaceLayoutId: selection.workspaceLayoutId,
                        });
                    } else {
                        vscode.postMessage({ command: "cancelProfileRestore", restoreId: msg.restoreId });
                    }
                });
                break;
            case "profiles":
                // Fase 2: atualiza os perfis após concluir o carregamento
                if (currentState) {
                    currentState.profiles = msg.data || [];
                }
                renderProfiles(msg.data || []);
                btnRefresh.classList.remove("spinning");
                break;
        }
    });

    // ========================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ========================================

    /** Render entire UI based on state */
    function renderState(state) {
        if (!state.isAuthenticated) {
            loginSection.style.display = "";
            dashboardSection.style.display = "none";
            appdataSection.style.display = "none";
            headerUser.innerHTML = "";
            return;
        }

        loginSection.style.display = "none";
        dashboardSection.style.display = "";
        appdataSection.style.display = "";

        // Save sync items config from backend
        syncItemsConfig = state.syncItems || [];

        // Header user info
        const avatarHtml = state.picture
            ? `<img class="avatar avatar-sm" src="${escapeAttr(state.picture)}" alt="" />`
            : `<span class="codicon codicon-account"></span>`;
        headerUser.innerHTML = `
            ${avatarHtml}
            <span>${escapeHtml(t("autenticacao.contaConectada"))}</span>
        `;

        // Account info with avatar
        const accountCard = document.querySelector(".account-info");
        if (accountCard) {
            const acctAvatar = state.picture
                ? `<img class="avatar" src="${escapeAttr(state.picture)}" alt="" />`
                : `<span class="status-dot status-online"></span>`;
            accountCard.innerHTML = `
                ${acctAvatar}
                <span class="account-email">${escapeHtml(t("autenticacao.contaConectada"))}</span>
            `;
        }

        // Profiles: null = loading, [] = empty, [...] = has data
        if (state.profiles === null) {
            // Show loading spinner + spin refresh button
            profileCount.textContent = "...";
            profilesList.innerHTML = `
                <div class="profiles-loading">
                    <span class="spinner"></span>
                    <span>${escapeHtml(t("perfil.carregando"))}</span>
                </div>
            `;
            profilesEmpty.style.display = "none";
            btnRefresh.classList.add("spinning");
        } else {
            renderProfiles(state.profiles || []);
        }

        // Auto-load app data files on first state
        btnRefreshAppdata.classList.add("spinning");
        pageTokenStack = []; currentPageToken = null; nextPageToken = null; currentPage = 1;
        fetchAppDataFiles(currentFolderId, null, null);
    }

    /** Render profile cards list */
    function renderProfiles(profiles) {
        profileCount.textContent = profiles.length;

        if (profiles.length === 0) {
            profilesEmpty.style.display = "";
            profilesList.innerHTML = "";
            return;
        }

        profilesEmpty.style.display = "none";

        profilesList.innerHTML = profiles
            .map((p) => {
                const modified = p.modifiedTime ? formatDate(p.modifiedTime) : t("comum.desconhecido");
                return `
                <div class="profile-card">
                    <div class="profile-name">
                        <span class="codicon codicon-file-code"></span>
                        ${escapeHtml(p.name)}
                    </div>
                    <div class="profile-meta">
                        <span class="codicon codicon-calendar" style="font-size:11px;"></span>
                        ${modified}
                    </div>
                    <div class="profile-actions">
                        <button class="btn btn-accent btn-sm"
                                data-action="pull" data-file="${escapeAttr(p.fileName)}"
                                title="${escapeAttr(t("perfil.aplicarDescricao"))}">
                            <span class="codicon codicon-cloud-download"></span>
                            ${escapeHtml(t("comum.aplicar"))}
                        </button>
                        <button class="btn btn-secondary btn-sm"
                                data-action="push" data-file="${escapeAttr(p.fileName)}"
                                title="${escapeAttr(t("perfil.atualizarDescricao"))}">
                            <span class="codicon codicon-cloud-upload"></span>
                            ${escapeHtml(t("comum.atualizar"))}
                        </button>
                        <button class="btn btn-danger btn-sm"
                                data-action="delete" data-file="${escapeAttr(p.fileName)}"
                                title="${escapeAttr(t("perfil.excluirDescricao"))}" aria-label="${escapeAttr(t("perfil.excluirDescricao"))}">
                            <span class="codicon codicon-trash"></span>
                        </button>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    // === Loading Handler ===
    function handleLoading(action, loading) {
        const btns = document.querySelectorAll("[data-action]");
        btns.forEach((btn) => {
            const key = `${btn.dataset.action}-${btn.dataset.file}`;
            if (action === key) {
                btn.disabled = loading;
                if (loading) {
                    btn.dataset.originalHtml = btn.innerHTML;
                    btn.innerHTML = '<span class="spinner"></span>';
                } else if (btn.dataset.originalHtml) {
                    btn.innerHTML = btn.dataset.originalHtml;
                    delete btn.dataset.originalHtml;
                }
            }
        });

        if (action === "login") {
            btnLogin.disabled = loading;
            if (loading) {
                btnLogin.innerHTML = `<span class="spinner"></span> ${escapeHtml(t("autenticacao.iniciandoSessao"))}`;
            } else {
                btnLogin.innerHTML = `<span class="codicon codicon-sign-in"></span> ${escapeHtml(t("pagina.iniciarSessaoGoogle"))}`;
            }
        }

        if (action === "createProfile") {
            btnCreateProfile.disabled = loading;
        }
    }

    // ========================================
    // UTILITIES
    // ========================================

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function formatDate(isoString) {
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString(localizacao.localidade, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        } catch {
            return isoString;
        }
    }

    // === Initialize ===
    vscode.postMessage({ command: "getState" });
})();

