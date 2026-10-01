# Checklist de validação da release candidata

Execute esta validação em outro perfil do Antigravity ou em outra máquina, sem extensões e configurações já presentes.

- [x] Instalar o VSIX gerado por `npm run package:vsix`.
- [ ] Abrir `Sync Antigravity` e concluir o login Google.
- [ ] Confirmar o escopo único `drive.appdata` no consentimento.
- [ ] Criar ou localizar um perfil e executar **Atualizar**.
- [ ] Em outro perfil ou máquina, executar **Aplicar** e conferir configurações, atalhos e snippets nos caminhos detectados automaticamente.
- [ ] Revisar e confirmar a prévia de extensões antes da instalação.
- [ ] Restaurar layout global e, com um workspace aberto, restaurar o layout correspondente. **Não validado nesta release candidata: tratado como dívida técnica antes de declarar suporte completo ao layout.**
- [ ] Executar rollback de layout e confirmar a recuperação.
- [ ] Desinstalar o VSIX de teste e confirmar que os dados remotos não foram apagados sem ação explícita.

Registre qualquer falha em uma issue antes de criar a tag de versão estável.

## Dívida técnica conhecida

- A restauração do layout global e do layout por workspace não foi testada nesta release candidata por decisão consciente. A publicação pode prosseguir com essa limitação documentada, mas a validação deve ser executada e registrada antes de prometer suporte completo ao layout em uma versão futura.
