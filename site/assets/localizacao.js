const IDIOMA_PADRAO = 'pt-BR';
const IDIOMA_INGLES = 'en';
const CHAVE_IDIOMA = 'sync-antigravity.idioma';

const traducoes = {
  'pt-BR': {
    'meta.homeTitle': 'Sync Antigravity - Seu ambiente, em qualquer máquina',
    'meta.homeDescription': 'Sincronize configurações, extensões, atalhos, snippets e layout do Antigravity IDE entre seus dispositivos com o Google Drive.',
    'meta.privacyTitle': 'Política de Privacidade - Sync Antigravity',
    'meta.privacyDescription': 'Política de Privacidade do Sync Antigravity.',
    'meta.termsTitle': 'Termos de Serviço - Sync Antigravity',
    'meta.termsDescription': 'Termos de Serviço do Sync Antigravity.',
    'access.skip': 'Pular para o conteúdo',
    'access.home': 'Sync Antigravity - início',
    'access.navigation': 'Navegação principal',
    'access.preview': 'Prévia de um perfil de sincronização',
    'access.proof': 'Princípios do produto',
    'language.toggle': 'Mudar idioma para inglês',
    'nav.how': 'Como funciona',
    'nav.security': 'Segurança',
    'nav.questions': 'Perguntas',
    'nav.start': 'Começar',
    'hero.eyebrow': 'Perfis portáteis para o Antigravity IDE',
    'hero.title': 'Seu jeito de trabalhar não deveria ficar preso a uma máquina.',
    'hero.description': 'Guarde as escolhas que moldam a sua IDE e aplique o mesmo ambiente quando trocar de computador. Sem procurar pastas, sem tentar lembrar cada ajuste.',
    'hero.guide': 'Ver como começar',
    'hero.code': 'Ver código no GitHub',
    'hero.note': 'Código aberto, licença MIT e armazenamento na sua conta Google.',
    'hero.profile': 'Perfil ativo',
    'hero.profileName': 'IDE-Principal',
    'hero.profileState': 'Pronto para aplicar',
    'hero.settings': 'Configurações e atalhos',
    'hero.extensions': 'Extensões confirmadas',
    'hero.layout': 'Layout com prévia',
    'proof.google': 'Google Drive privado',
    'proof.preview': 'Prévia antes de aplicar',
    'proof.source': 'Código aberto',
    'problem.eyebrow': 'O que ele resolve',
    'problem.title': 'Reconstruir uma IDE à mão é trabalho repetido.',
    'problem.description': 'Extensões, atalhos, configurações e organização visual levam tempo para ficar do jeito certo. Um perfil reúne essas escolhas para você levá-las ao próximo ambiente com critério.',
    'profile.eyebrow': 'O que pode entrar no perfil',
    'profile.title': 'Você decide o que acompanha você.',
    'profile.description': 'Sync Antigravity trabalha com escolhas explícitas: cada item pode ser incluído ou deixado de fora do perfil.',
    'profile.settings.title': 'Configurações',
    'profile.settings.description': 'Preferências salvas no arquivo settings.json.',
    'profile.keys.title': 'Atalhos',
    'profile.keys.description': 'Comandos onde a sua memória espera encontrá-los.',
    'profile.extensions.title': 'Extensões',
    'profile.extensions.description': 'Mudanças são mostradas e confirmadas antes da aplicação.',
    'profile.snippets.title': 'Snippets',
    'profile.snippets.description': 'Seus trechos reutilizáveis continuam disponíveis.',
    'profile.layout.title': 'Layout',
    'profile.layout.description': 'Itens permitidos com prévia e backup local.',
    'profile.profiles.title': 'Perfis',
    'profile.profiles.description': 'Contextos diferentes, como IDE principal e notebook.',
    'guide.eyebrow': 'Um fluxo simples',
    'guide.title': 'Crie aqui. Aplique lá.',
    'guide.step1.title': 'Instale a extensão',
    'guide.step1.description': 'No Antigravity, procure por Sync Antigravity no painel de extensões. Enquanto a loja não estiver disponível, instale o VSIX pela página de releases.',
    'guide.step2.title': 'Entre com sua conta Google',
    'guide.step2.description': 'Abra o painel e escolha Iniciar sessão com o Google. A permissão solicitada é restrita ao espaço privado de dados do aplicativo.',
    'guide.step3.title': 'Crie o perfil',
    'guide.step3.description': 'Dê um nome que você reconheça, escolha os itens e confirme. O perfil vai para a área privada do Google Drive.',
    'guide.step4.title': 'Mantenha-o atualizado',
    'guide.step4.description': 'Depois de mudar preferências, atalhos ou layout, use Atualizar no mesmo perfil. Não é preciso criar outro.',
    'guide.step5.title': 'Aplique em outra máquina',
    'guide.step5.description': 'Entre na mesma conta, selecione Aplicar, revise a prévia e aceite reiniciar a janela quando a extensão solicitar.',
    'apply.eyebrow': 'Antes da aplicação',
    'apply.title': 'Aplicar um perfil não é despejar arquivos em uma pasta.',
    'apply.description': 'A extensão encontra os caminhos da instalação atual e apresenta uma prévia antes de mudar configurações, atalhos, snippets, extensões ou layout.',
    'apply.check1': 'Confirmação antes de alterar extensões',
    'apply.check2': 'Backup local antes das configurações',
    'apply.check3': 'Prévia dos itens de layout permitidos',
    'apply.check4': 'Reinicialização apenas quando necessária',
    'security.eyebrow': 'Privacidade por padrão',
    'security.title': 'O perfil fica na sua conta. O controle também.',
    'security.description': 'Os dados são armazenados no appDataFolder, a área privada do Google Drive reservada ao aplicativo. Eles não aparecem nos seus arquivos comuns.',
    'security.scopeTerm': 'Permissão Google',
    'security.scopeValue': 'Apenas drive.appdata.',
    'security.tokensTerm': 'Tokens',
    'security.tokensValue': 'Guardados no armazenamento seguro da IDE.',
    'security.telemetryTerm': 'Telemetria',
    'security.telemetryValue': 'Não coletamos telemetria nem vendemos dados.',
    'faq.eyebrow': 'Perguntas frequentes',
    'faq.title': 'O que você precisa saber antes de usar.',
    'faq.q1': 'Preciso usar o mesmo computador?',
    'faq.a1': 'Não. Instale o Sync Antigravity em outro computador, entre na mesma conta Google e aplique o perfil.',
    'faq.q2': 'As extensões são instaladas sem eu saber?',
    'faq.a2': 'Não. A extensão mostra as alterações de extensões e pede confirmação antes de aplicá-las.',
    'faq.q3': 'Posso ter mais de um perfil?',
    'faq.a3': 'Sim. Perfis diferentes ajudam a separar a IDE principal, um notebook ou um ambiente de trabalho.',
    'faq.q4': 'Posso desfazer um layout aplicado?',
    'faq.a4': 'Sim. Use o comando Sync Antigravity: Reverter último layout para restaurar o backup local mais recente.',
    'faq.q5': 'O que acontece se eu encerrar a sessão?',
    'faq.a5': 'O token local é removido. Seus perfis permanecem na área privada da conta Google até serem excluídos por você.',
    'closing.eyebrow': 'Próximo passo',
    'closing.title': 'Leve seu ambiente com você.',
    'closing.description': 'Instale a extensão, crie um perfil e deixe a próxima troca de computador ser só isso: uma troca de computador.',
    'closing.action': 'Ver releases no GitHub',
    'footer.privacy': 'Política de Privacidade',
    'footer.terms': 'Termos de Serviço',
    'footer.license': 'Distribuído sob a licença MIT.',
    'legal.document': 'Documento legal',
    'privacy.heading': 'Política de Privacidade',
    'privacy.updated': 'Última atualização: 30 de setembro de 2026.',
    'privacy.intro': 'O Sync Antigravity sincroniza, por escolha da pessoa usuária, configurações e preferências do Antigravity IDE entre dispositivos. A extensão é distribuída por lksferreira e não possui servidor próprio.',
    'privacy.dataTitle': 'Dados tratados',
    'privacy.data': 'Conforme os itens escolhidos na interface, a extensão pode tratar configurações, atalhos, snippets, lista de extensões e dados permitidos de layout. Esses dados são gravados somente no appDataFolder privado da conta Google autenticada.',
    'privacy.tokens': 'Os tokens OAuth ficam apenas no armazenamento seguro local da IDE (SecretStorage). Eles não são enviados ao repositório, a logs, a telemetria ou a um servidor da pessoa mantenedora.',
    'privacy.noDataTitle': 'Dados que não coletamos',
    'privacy.noData': 'A extensão não coleta telemetria, não vende dados, não usa anúncios e não solicita e-mail, nome, foto, contatos ou acesso aos arquivos comuns do Google Drive.',
    'privacy.scopeTitle': 'Permissão Google',
    'privacy.scope': 'O único escopo solicitado é drive.appdata, usado para criar, ler, atualizar e excluir os dados privados da própria aplicação no Google Drive.',
    'privacy.retentionTitle': 'Retenção e exclusão',
    'privacy.retention': 'Os dados remotos permanecem no appDataFolder até que a pessoa usuária os exclua na extensão ou remova os dados do aplicativo nas configurações da Conta Google. Os tokens locais permanecem até o encerramento da sessão ou a invalidação da credencial.',
    'privacy.securityTitle': 'Segurança',
    'privacy.security': 'A extensão usa OAuth com PKCE, HTTPS para a API do Google Drive e armazenamento seguro da IDE para tokens. Nenhuma medida de segurança elimina todos os riscos: mantenha o Antigravity, o sistema operacional e as extensões atualizados.',
    'privacy.contactTitle': 'Contato e alterações',
    'privacy.contact': 'Para dúvidas, solicitações ou relato de problema, abra uma issue no repositório do Sync Antigravity. Esta política pode ser atualizada quando a extensão ou exigências de plataforma mudarem; a data de atualização no topo indicará a versão vigente.',
    'terms.heading': 'Termos de Serviço',
    'terms.updated': 'Última atualização: 30 de setembro de 2026.',
    'terms.intro': 'Ao usar o Sync Antigravity, você concorda com estes termos.',
    'terms.purposeTitle': 'Finalidade',
    'terms.purpose': 'A extensão ajuda a sincronizar configurações, extensões, atalhos, snippets e layout permitido do Antigravity IDE pela conta Google escolhida pela própria pessoa usuária.',
    'terms.responsibilityTitle': 'Responsabilidade da pessoa usuária',
    'terms.responsibility': 'Você é responsável por revisar a prévia antes de aplicar um perfil, manter cópias de segurança de configurações importantes e usar somente uma Conta Google sob seu controle. A sincronização de extensões pede confirmação justamente porque instalar extensões de terceiros pode introduzir riscos.',
    'terms.limitsTitle': 'Limitações',
    'terms.limits': 'O projeto é fornecido sob a licença MIT, sem garantia de funcionamento ininterrupto ou de adequação a uma finalidade específica. Layouts podem variar entre versões da IDE, sistemas operacionais, monitores e extensões instaladas. A pessoa mantenedora não é afiliada ao Google ou ao Antigravity IDE.',
    'terms.thirdPartyTitle': 'Serviços de terceiros',
    'terms.thirdParty': 'O uso do login e do armazenamento está sujeito aos termos e políticas do Google. A distribuição pelo Open VSX está sujeita às regras daquela plataforma.',
    'terms.contactTitle': 'Alterações e contato',
    'terms.contact': 'Estes termos podem ser atualizados quando necessário. Problemas e dúvidas devem ser registrados nas issues do repositório.'
  },
  en: {
    'meta.homeTitle': 'Sync Antigravity - Your workspace, on any machine',
    'meta.homeDescription': 'Sync Antigravity IDE settings, extensions, keyboard shortcuts, snippets, and layout across your devices with Google Drive.',
    'meta.privacyTitle': 'Privacy Policy - Sync Antigravity',
    'meta.privacyDescription': 'Sync Antigravity Privacy Policy.',
    'meta.termsTitle': 'Terms of Service - Sync Antigravity',
    'meta.termsDescription': 'Sync Antigravity Terms of Service.',
    'access.skip': 'Skip to content',
    'access.home': 'Sync Antigravity - home',
    'access.navigation': 'Main navigation',
    'access.preview': 'Preview of a synchronization profile',
    'access.proof': 'Product principles',
    'language.toggle': 'Switch language to Brazilian Portuguese',
    'nav.how': 'How it works',
    'nav.security': 'Security',
    'nav.questions': 'Questions',
    'nav.start': 'Get started',
    'hero.eyebrow': 'Portable profiles for Antigravity IDE',
    'hero.title': 'The way you work should not be tied to one machine.',
    'hero.description': 'Keep the choices that shape your IDE and apply the same workspace when you move to another computer. No hunting through folders. No trying to remember every tweak.',
    'hero.guide': 'See how to get started',
    'hero.code': 'View source on GitHub',
    'hero.note': 'Open source, MIT licensed, and stored in your Google account.',
    'hero.profile': 'Active profile',
    'hero.profileName': 'Main-IDE',
    'hero.profileState': 'Ready to apply',
    'hero.settings': 'Settings and shortcuts',
    'hero.extensions': 'Extensions confirmed',
    'hero.layout': 'Layout preview available',
    'proof.google': 'Private Google Drive',
    'proof.preview': 'Preview before applying',
    'proof.source': 'Open source',
    'problem.eyebrow': 'What it solves',
    'problem.title': 'Rebuilding an IDE by hand is repeated work.',
    'problem.description': 'Extensions, keyboard shortcuts, settings, and visual organization take time to get right. A profile brings those decisions together so you can move them to your next workspace deliberately.',
    'profile.eyebrow': 'What can be in a profile',
    'profile.title': 'You decide what travels with you.',
    'profile.description': 'Sync Antigravity works through explicit choices: each item can be included in or left out of a profile.',
    'profile.settings.title': 'Settings',
    'profile.settings.description': 'Preferences stored in your settings.json file.',
    'profile.keys.title': 'Keyboard shortcuts',
    'profile.keys.description': 'Commands where your muscle memory expects them.',
    'profile.extensions.title': 'Extensions',
    'profile.extensions.description': 'Changes are shown and confirmed before they are applied.',
    'profile.snippets.title': 'Snippets',
    'profile.snippets.description': 'Your reusable snippets stay within reach.',
    'profile.layout.title': 'Layout',
    'profile.layout.description': 'Allowed items with preview and a local backup.',
    'profile.profiles.title': 'Profiles',
    'profile.profiles.description': 'Different contexts, such as a main IDE and a laptop.',
    'guide.eyebrow': 'A simple flow',
    'guide.title': 'Create here. Apply there.',
    'guide.step1.title': 'Install the extension',
    'guide.step1.description': 'In Antigravity, look for Sync Antigravity in the Extensions panel. Until the marketplace is available, install the VSIX from the releases page.',
    'guide.step2.title': 'Sign in with Google',
    'guide.step2.description': 'Open the panel and choose Sign in with Google. The requested permission is limited to the app private-data space.',
    'guide.step3.title': 'Create a profile',
    'guide.step3.description': 'Give it a recognizable name, choose its items, and confirm. The profile goes to the private area of your Google Drive.',
    'guide.step4.title': 'Keep it current',
    'guide.step4.description': 'After changing preferences, shortcuts, or layout, use Update on the same profile. There is no need to create another one.',
    'guide.step5.title': 'Apply on another machine',
    'guide.step5.description': 'Sign in with the same account, select Apply, review the preview, and accept a window reload when the extension requests it.',
    'apply.eyebrow': 'Before applying',
    'apply.title': 'Applying a profile is not dumping files into a folder.',
    'apply.description': 'The extension finds the current installation paths and shows a preview before changing settings, shortcuts, snippets, extensions, or layout.',
    'apply.check1': 'Confirmation before extension changes',
    'apply.check2': 'Local backup before settings changes',
    'apply.check3': 'Preview of allowed layout items',
    'apply.check4': 'Reload only when needed',
    'security.eyebrow': 'Privacy by default',
    'security.title': 'The profile lives in your account. Control does too.',
    'security.description': 'Data is stored in appDataFolder, the private Google Drive area reserved for the app. It does not appear in your regular Drive files.',
    'security.scopeTerm': 'Google permission',
    'security.scopeValue': 'Only drive.appdata.',
    'security.tokensTerm': 'Tokens',
    'security.tokensValue': 'Stored in the IDE secure storage.',
    'security.telemetryTerm': 'Telemetry',
    'security.telemetryValue': 'We do not collect telemetry or sell data.',
    'faq.eyebrow': 'Frequently asked questions',
    'faq.title': 'What you should know before using it.',
    'faq.q1': 'Do I need to use the same computer?',
    'faq.a1': 'No. Install Sync Antigravity on another computer, sign in with the same Google account, and apply the profile.',
    'faq.q2': 'Are extensions installed without my knowledge?',
    'faq.a2': 'No. The extension shows extension changes and asks for confirmation before applying them.',
    'faq.q3': 'Can I have more than one profile?',
    'faq.a3': 'Yes. Different profiles help separate a main IDE, a laptop, or a work environment.',
    'faq.q4': 'Can I undo an applied layout?',
    'faq.a4': 'Yes. Use the Sync Antigravity: Revert last layout command to restore the latest local backup.',
    'faq.q5': 'What happens when I sign out?',
    'faq.a5': 'The local token is removed. Your profiles remain in your Google account private area until you delete them.',
    'closing.eyebrow': 'Next step',
    'closing.title': 'Take your workspace with you.',
    'closing.description': 'Install the extension, create a profile, and let the next computer change be just that: a computer change.',
    'closing.action': 'View releases on GitHub',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.license': 'Distributed under the MIT License.',
    'legal.document': 'Legal document',
    'privacy.heading': 'Privacy Policy',
    'privacy.updated': 'Last updated: September 30, 2026.',
    'privacy.intro': 'Sync Antigravity syncs Antigravity IDE settings and preferences between devices when the user chooses to do so. The extension is distributed by lksferreira and does not run its own server.',
    'privacy.dataTitle': 'Data handled',
    'privacy.data': 'Based on the items selected in the interface, the extension may handle settings, shortcuts, snippets, an extension list, and allowed layout data. This data is stored only in the authenticated Google account private appDataFolder.',
    'privacy.tokens': 'OAuth tokens remain only in the IDE local secure storage (SecretStorage). They are not sent to the repository, logs, telemetry, or a maintainer server.',
    'privacy.noDataTitle': 'Data we do not collect',
    'privacy.noData': 'The extension does not collect telemetry, sell data, use ads, or request email, name, photo, contacts, or access to regular Google Drive files.',
    'privacy.scopeTitle': 'Google permission',
    'privacy.scope': 'The only requested scope is drive.appdata, which creates, reads, updates, and deletes the app private data in Google Drive.',
    'privacy.retentionTitle': 'Retention and deletion',
    'privacy.retention': 'Remote data remains in appDataFolder until you delete it in the extension or remove the app data in your Google Account settings. Local tokens remain until sign-out or credential invalidation.',
    'privacy.securityTitle': 'Security',
    'privacy.security': 'The extension uses OAuth with PKCE, HTTPS for the Google Drive API, and the IDE secure storage for tokens. No security measure removes every risk: keep Antigravity, your operating system, and extensions updated.',
    'privacy.contactTitle': 'Contact and changes',
    'privacy.contact': 'For questions, requests, or issue reports, open an issue in the Sync Antigravity repository. This policy may change when the extension or platform requirements change; the date at the top indicates the current version.',
    'terms.heading': 'Terms of Service',
    'terms.updated': 'Last updated: September 30, 2026.',
    'terms.intro': 'By using Sync Antigravity, you agree to these terms.',
    'terms.purposeTitle': 'Purpose',
    'terms.purpose': 'The extension helps sync settings, extensions, shortcuts, snippets, and allowed Antigravity IDE layout through the Google account chosen by the user.',
    'terms.responsibilityTitle': 'User responsibility',
    'terms.responsibility': 'You are responsible for reviewing the preview before applying a profile, keeping backups of important settings, and using only a Google Account under your control. Extension synchronization asks for confirmation because third-party extensions can introduce risks.',
    'terms.limitsTitle': 'Limitations',
    'terms.limits': 'The project is provided under the MIT License without warranty of uninterrupted operation or fitness for a particular purpose. Layouts can vary across IDE versions, operating systems, monitors, and installed extensions. The maintainer is not affiliated with Google or Antigravity IDE.',
    'terms.thirdPartyTitle': 'Third-party services',
    'terms.thirdParty': 'Sign-in and storage are subject to Google terms and policies. Open VSX distribution is subject to that platform rules.',
    'terms.contactTitle': 'Changes and contact',
    'terms.contact': 'These terms may be updated when necessary. Issues and questions should be registered in the repository issues.'
  }
};

function obterIdiomaInicial() {
  try {
    const idiomaSalvo = window.localStorage.getItem(CHAVE_IDIOMA);
    if (idiomaSalvo === IDIOMA_PADRAO || idiomaSalvo === IDIOMA_INGLES) {
      return idiomaSalvo;
    }
  } catch {
    // A página continua utilizável quando o armazenamento local está indisponível.
  }

  const idiomasDoNavegador = navigator.languages ?? [navigator.language];
  return idiomasDoNavegador.some((idioma) => idioma?.toLowerCase().startsWith('en'))
    ? IDIOMA_INGLES
    : IDIOMA_PADRAO;
}

function obterTraducao(chave, idioma) {
  return traducoes[idioma][chave] ?? traducoes[IDIOMA_PADRAO][chave] ?? chave;
}

function aplicarIdioma(idioma, persistir) {
  document.documentElement.lang = idioma;
  document.documentElement.dataset.idioma = idioma;

  document.querySelectorAll('[data-i18n]').forEach((elemento) => {
    elemento.textContent = obterTraducao(elemento.dataset.i18n, idioma);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((elemento) => {
    elemento.setAttribute('aria-label', obterTraducao(elemento.dataset.i18nAriaLabel, idioma));
  });

  document.querySelectorAll('[data-i18n-content]').forEach((elemento) => {
    elemento.setAttribute('content', obterTraducao(elemento.dataset.i18nContent, idioma));
  });

  const chaveDoTitulo = document.body.dataset.titulo;
  if (chaveDoTitulo) {
    document.title = obterTraducao(chaveDoTitulo, idioma);
  }

  const botaoDeIdioma = document.querySelector('[data-alternar-idioma]');
  if (botaoDeIdioma) {
    botaoDeIdioma.textContent = idioma === IDIOMA_INGLES ? 'PT-BR' : 'EN';
  }

  if (persistir) {
    try {
      window.localStorage.setItem(CHAVE_IDIOMA, idioma);
    } catch {
      // A preferência não é essencial para a localização da página.
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let idiomaAtual = obterIdiomaInicial();
  aplicarIdioma(idiomaAtual, false);

  const botaoDeIdioma = document.querySelector('[data-alternar-idioma]');
  botaoDeIdioma?.addEventListener('click', () => {
    idiomaAtual = idiomaAtual === IDIOMA_INGLES ? IDIOMA_PADRAO : IDIOMA_INGLES;
    aplicarIdioma(idiomaAtual, true);
  });
});
