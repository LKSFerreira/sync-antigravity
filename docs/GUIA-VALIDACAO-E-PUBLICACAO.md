# Guia detalhado: validar e preparar a publicação

Este guia prepara o Sync Antigravity para publicação sem enviar nada ao marketplace. Execute as etapas na ordem indicada.

## Visão geral

1. Gerar um VSIX local verificável.
2. Testar em uma instalação limpa do Antigravity.
3. Configurar o publisher no Open VSX.
4. Vincular o workflow do GitHub como publisher confiável no Open VSX.
5. Publicar a documentação de privacidade e termos no GitHub.
6. Registrar o resultado para concluir a Fase 5.

## 1. Antes de começar

No PowerShell, abra a pasta do projeto e confira se não há alterações inesperadas:

```powershell
git status
```

O arquivo `.env` local deve conter os dois campos do cliente OAuth desktop:

```text
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

Não envie o `.env`, o arquivo baixado `client_secret_*.json` ou o token do Open VSX para ninguém. O JSON e o `.env` já são ignorados pelo Git e excluídos do VSIX. O valor técnico `GOOGLE_CLIENT_SECRET` é necessário dentro do bundle do cliente desktop, pois o Google o exige nesse fluxo; ele não é um token de usuário e não concede acesso a dados sem consentimento OAuth.

## 2. Gerar a release candidata local

Execute exatamente estes comandos:

```powershell
npm ci
npm test
npm run package:vsix
Get-FileHash .\artifacts\sync-antigravity.vsix -Algorithm SHA256
```

Resultados esperados:

- `npm ci`: instala exatamente as versões do `package-lock.json`.
- `npm test`: todos os testes passam e a cobertura fica acima de 80%.
- `npm run package:vsix`: cria `artifacts\sync-antigravity.vsix`.
- `Get-FileHash`: mostra o hash SHA-256 do arquivo que será testado.

Se algum comando falhar, pare aqui e registre a mensagem de erro antes de tentar publicar.

## 3. Preparar o computador de origem

No Antigravity que já está configurado como você gosta:

1. Abra o Sync Antigravity e entre na sua Conta Google.
2. Crie um perfil de teste com um nome reconhecível, por exemplo `release-candidata`.
3. Marque os itens que deseja validar: configurações, atalhos, snippets, extensões e layout.
4. Inclua pelo menos um snippet de teste não sensível e uma alteração visual fácil de reconhecer no layout.
5. Execute o envio do perfil para o Google Drive.

Evite usar configurações que contenham chaves, tokens, senhas ou dados corporativos no perfil de teste.

## 4. Preparar uma instalação limpa

Use preferencialmente outro computador. Como alternativa, use outra conta do sistema operacional ou um perfil novo do Antigravity, sem extensões e configurações anteriores.

Antes de instalar, tire uma captura de tela do layout vazio. Ela será a referência para confirmar que a restauração realmente alterou o ambiente.

## 5. Instalar o VSIX de teste

Copie `artifacts\sync-antigravity.vsix` para a instalação limpa. No Antigravity:

1. Abra a tela de **Extensões**.
2. Abra o menu `...`.
3. Escolha **Instalar do VSIX**.
4. Selecione `sync-antigravity.vsix`.
5. Reinicie o Antigravity se ele solicitar.
6. Confirme que aparece `Sync Antigravity` na lista de extensões e na barra de status.

## 6. Validar o login Google

1. Abra o comando `Sync Antigravity: Abrir painel`.
2. Clique em **Iniciar sessão com o Google**.
3. No navegador, confirme que o nome exibido é `Sync Antigravity`.
4. Confira que a permissão solicitada é somente `drive.appdata`.
5. Autorize e aguarde a página de sucesso.
6. Retorne ao Antigravity e confirme que a sessão aparece como conectada.

Enquanto o app OAuth estiver no modo **Testando**, o aviso de aplicativo não verificado é esperado para os usuários de teste autorizados no Google Cloud. Não compartilhe a extensão com pessoas fora dessa lista até colocar o consentimento OAuth em produção.

## 7. Validar a sincronização inteira

Siga este roteiro e marque o resultado no [checklist de release candidata](VALIDACAO-RELEASE-CANDIDATA.md):

1. Localize o perfil `release-candidata`.
2. Execute a restauração e leia a prévia antes de confirmar.
3. Confirme configurações e atalhos.
4. Confirme que o snippet de teste apareceu.
5. Confirme a lista de extensões antes de qualquer instalação ou remoção.
6. Confirme que o layout global mudou conforme o computador de origem.
7. Abra um workspace e teste a restauração do layout dele.
8. Execute `Sync Antigravity: Reverter último layout` e confirme que o backup local restaura o estado anterior.
9. Feche e reabra o Antigravity para confirmar que a sessão e o ambiente continuam estáveis.

Anote qualquer divergência: item, resultado esperado, resultado observado e captura de tela.

## 8. Criar a conta de publisher no Open VSX

O Open VSX exige um Publisher Agreement da Eclipse Foundation. Faça isso uma única vez:

1. Crie uma conta em [accounts.eclipse.org](https://accounts.eclipse.org). No perfil, informe seu usuário GitHub exatamente como `LKSFerreira`.
2. Acesse [open-vsx.org](https://open-vsx.org) e entre com a mesma conta GitHub.
3. No avatar, abra **Settings** e escolha **Log in with Eclipse**.
4. Abra **Show Publisher Agreement**, leia até o final e aceite se concordar.
5. Em **Settings > Access Tokens**, crie um token temporário chamado `Criar namespace - Sync Antigravity`.
6. Copie o token imediatamente. Ele não será mostrado de novo.

## 9. Criar e proteger o namespace

No PowerShell do projeto, defina o token somente para o processo atual e crie o namespace:

```powershell
$securePat = Read-Host "Cole o token do Open VSX" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePat)
$env:OVSX_PAT = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)

npm run openvsx:create-namespace

Remove-Item Env:\OVSX_PAT
```

O resultado esperado é a criação do namespace `lksferreira`. Depois, solicite a propriedade do namespace seguindo as [instruções oficiais](https://github.com/eclipse-openvsx/openvsx/wiki/Namespace-Access); isso permite que as extensões apareçam como verificadas.

## 10. Configurar publicação confiável por OIDC

1. No Open VSX, abra **Settings > Trusted publishers** e selecione o namespace `lksferreira`.
2. Adicione um publisher do tipo **GitHub Actions**.
3. Informe o repositório `LKSFerreira/sync-antigravity` e o workflow `.github/workflows/release.yml`.
4. Salve a configuração.

O workflow usará OpenID Connect (OIDC) para solicitar um token de curta duração ao Open VSX no momento da tag. Não crie o secret `OVSX_PAT` no GitHub. Depois de criar o namespace, revogue o token temporário usado para essa operação.

## 10.1 Credenciais do cliente OAuth para a release

Antes da primeira tag de release, crie também estes dois secrets no GitHub Actions, com os valores do seu `.env` local:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Eles são usados somente durante o build da release para gerar um VSIX funcional. O `client_secret` de um cliente OAuth desktop não é tratado pelo Google como um segredo de usuário: ele é incluído no VSIX porque o endpoint de tokens desse cliente o exige. Nunca coloque tokens de acesso, tokens de atualização ou o arquivo JSON completo em secrets de build.

## 11. Preparar o OAuth para produção

Depois que os documentos desta fase estiverem enviados ao GitHub, abra o Google Cloud:

1. Vá para **Google Auth Platform > Branding**.
2. Informe a página inicial do repositório.
3. Informe os links públicos da [política de privacidade](POLITICA-DE-PRIVACIDADE.md) e dos [termos](TERMOS-DE-SERVICO.md).
4. Em **Público-alvo**, mantenha em teste até a validação terminar.
5. Antes de disponibilizar a extensão ao público, siga o fluxo de publicação e verificação exigido pelo Google para o escopo solicitado.

## 12. O que me enviar ao final

Quando terminar, informe apenas:

- se a instalação limpa passou ou quais itens falharam;
- se o namespace `lksferreira` foi criado;
- se o publisher confiável do workflow foi configurado no Open VSX;
- se a propriedade do namespace foi solicitada;
- se o branding do Google recebeu os links públicos.

Não envie token, Client ID completo, arquivo JSON de credenciais ou qualquer captura contendo esses dados.

## Referências

- [Publicação de extensões - Open VSX](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions)
- [Acesso e propriedade de namespaces - Open VSX](https://github.com/eclipse-openvsx/openvsx/wiki/Namespace-Access)
- [CLI oficial `ovsx`](https://github.com/eclipse-openvsx/openvsx/tree/main/cli)
