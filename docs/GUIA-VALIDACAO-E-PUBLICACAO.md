# Guia detalhado: validar, configurar e publicar

Este guia prepara o Sync Antigravity para uma publicação verificável. Execute as etapas na ordem indicada e não crie uma tag de release enquanto o namespace e o publisher confiável do Open VSX estiverem pendentes.

## Visão geral

1. Gerar um VSIX local verificável.
2. Testar em uma instalação limpa do Antigravity.
3. Registrar as credenciais de build no GitHub.
4. Confirmar o site público e o Branding do OAuth.
5. Aguardar a aprovação da propriedade do namespace no Open VSX.
6. Vincular o workflow do GitHub como publisher confiável no Open VSX.
7. Criar uma tag para o GitHub Actions publicar o VSIX, o hash e a release.

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

Se o **Público-alvo** do Google Auth Platform estiver em **Testando**, só pessoas adicionadas como usuárias de teste poderão concluir o login. Em **Produção**, o login pode ser usado por pessoas externas, mas o Google ainda pode mostrar um aviso enquanto a revisão do Branding ou do aplicativo não tiver terminado. Confira o estado atual em **Google Auth Platform > Público-alvo** e **Central de verificação** antes de divulgar a extensão.

## 7. Validar a sincronização inteira

Siga este roteiro e marque o resultado no [checklist de release candidata](VALIDACAO-RELEASE-CANDIDATA.md):

1. Localize o perfil `release-candidata`.
2. Execute **Aplicar** e leia a prévia antes de confirmar.
3. Confirme configurações e atalhos.
4. Confirme que o snippet de teste apareceu.
5. Confirme a lista de extensões antes de qualquer instalação ou remoção.
6. Se a validação de layout fizer parte desta release, confirme que o layout global mudou conforme o computador de origem.
7. Se a validação de layout fizer parte desta release, abra um workspace e teste a aplicação do layout correspondente.
8. Se o layout foi aplicado, execute `Sync Antigravity: Reverter último layout` e confirme que o backup local restaura o estado anterior.
9. Feche e reabra o Antigravity para confirmar que a sessão e o ambiente continuam estáveis.

Anote qualquer divergência: item, resultado esperado, resultado observado e captura de tela. Caso a validação de layout seja deliberadamente adiada, deixe os itens correspondentes desmarcados no [checklist](VALIDACAO-RELEASE-CANDIDATA.md) e registre a dívida técnica.

## 8. Preparar a conta e o namespace no Open VSX

O Open VSX exige um Publisher Agreement da Eclipse Foundation. Faça isso uma única vez, caso ainda não tenha sido concluído:

1. Crie uma conta em [accounts.eclipse.org](https://accounts.eclipse.org). No perfil, informe seu usuário GitHub exatamente como `LKSFerreira`.
2. Acesse [open-vsx.org](https://open-vsx.org) e entre com a mesma conta GitHub.
3. No avatar, abra **Settings** e escolha **Log in with Eclipse**.
4. Abra **Show Publisher Agreement**, leia até o final e aceite se concordar.
5. Crie ou confirme o namespace `lksferreira` no Open VSX.
6. Use **Claim Ownership** para abrir a solicitação pública de propriedade. Para este projeto, a evidência é a correspondência entre o namespace `lksferreira`, a conta GitHub `LKSFerreira` e o repositório `LKSFerreira/sync-antigravity`.
7. Aguarde a aprovação da solicitação. Enquanto o namespace estiver marcado como não verificado, não é possível registrar o publisher confiável.

Não é necessário criar um token de acesso pessoal do Open VSX para o fluxo de release deste projeto. O token só seria necessário para um envio manual excepcional; não o crie nem o armazene no GitHub sem uma necessidade concreta.

## 9. Credenciais do cliente OAuth para a release

Antes da primeira tag de release, crie também estes dois secrets no GitHub Actions, com os valores do seu `.env` local:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Eles são usados somente durante o build da release para gerar um VSIX funcional. Em GitHub, abra **Settings > Secrets and variables > Actions > New repository secret** e crie um secret por vez. O `client_secret` de um cliente OAuth desktop não é tratado pelo Google como um segredo de usuário: ele é incluído no VSIX porque o endpoint de tokens desse cliente o exige. Nunca coloque tokens de acesso, tokens de atualização ou o arquivo JSON completo em secrets de build.

## 10. Preparar e publicar o Branding do OAuth

O Branding deve usar páginas públicas do projeto, hospedadas no mesmo domínio verificado. Abra o Google Cloud:

1. Vá para **Google Auth Platform > Branding**.
2. Informe `https://sync.semsusto.app/` como página inicial.
3. Informe `https://sync.semsusto.app/privacidade/` como Política de Privacidade e `https://sync.semsusto.app/termos/` como Termos de Serviço.
4. Em **Domínios autorizados**, mantenha somente o domínio raiz `semsusto.app`. Os caminhos `/privacidade/` e `/termos/` são páginas do site e não devem ser cadastrados como domínios.
5. Verifique a propriedade de `semsusto.app` no Google Search Console por meio de um registro DNS TXT. Não remova esse registro depois da verificação.
6. Salve e, quando o botão estiver disponível, selecione **Publicar branding**. A publicação do Branding não publica o código nem a extensão: ela apenas disponibiliza as informações do aplicativo na tela de consentimento.
7. Em **Público-alvo**, confirme o estado desejado. Para uso público, o aplicativo deve estar em **Produção** e pode exigir análise do Google antes de deixar de mostrar avisos.

## 11. Configurar publicação confiável por OIDC

Execute esta etapa somente depois que o Open VSX aprovar a propriedade do namespace:

1. No Open VSX, abra **Settings > Trusted publishers** e selecione o namespace `lksferreira`.
2. Adicione um publisher do tipo **GitHub Actions**.
3. Informe o repositório `LKSFerreira/sync-antigravity` e o workflow `.github/workflows/release.yml`.
4. Salve a configuração.

O workflow usará OpenID Connect (OIDC) para solicitar um token de curta duração ao Open VSX no momento da tag. Não crie o secret `OVSX_PAT` no GitHub para o deploy normal.

## 12. Criar a tag de release

Quando a validação, os secrets do GitHub, o Branding e o publisher confiável estiverem prontos, crie a tag:

```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

O workflow `.github/workflows/release.yml` recompila, testa, gera o VSIX, confere o conteúdo do pacote, publica o mesmo arquivo no Open VSX e cria uma release no GitHub com `SHA256SUMS`. Não crie a release manualmente.

## 13. O que registrar ao final

Quando terminar, informe apenas:

- se a instalação limpa passou ou quais itens falharam;
- se a propriedade do namespace `lksferreira` foi aprovada;
- se o publisher confiável do workflow foi configurado no Open VSX;
- se o Branding do Google está publicado e o aplicativo OAuth está em Produção;
- a URL da release no GitHub, a URL da extensão no Open VSX e o SHA-256 publicado.

Não envie token, Client ID completo, arquivo JSON de credenciais ou qualquer captura contendo esses dados.

## Referências

- [Publicação de extensões - Open VSX](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions)
- [Acesso e propriedade de namespaces - Open VSX](https://github.com/eclipse-openvsx/openvsx/wiki/Namespace-Access)
- [CLI oficial `ovsx`](https://github.com/eclipse-openvsx/openvsx/tree/main/cli)
