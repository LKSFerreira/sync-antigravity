# Sync Antigravity

> 🇧🇷 **Prefere ler em português? Acesse o [README em pt-BR](README.pt-BR.md).**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![Source code](https://img.shields.io/badge/GitHub-LKSFerreira%2Fsync--antigravity-blue)](https://github.com/LKSFerreira/sync-antigravity)

Sync settings, extensions, keyboard shortcuts, snippets, and the **Antigravity IDE** layout across devices using **Google Drive**.

The interface automatically follows the IDE language. Any Portuguese locale uses Brazilian Portuguese; English and unsupported languages use English.

Learn how to install and use the extension on the [Sync Antigravity website](https://sync.semsusto.app/).

> **Independent fork:** maintained by [LKSFerreira](https://github.com/LKSFerreira), derived from [thotam/antigravity-sync](https://github.com/thotam/antigravity-sync), and distributed under the MIT License.

> This extension is designed exclusively for [Antigravity IDE](https://www.antigravity.google/).

## What it syncs

| Item | Synchronized |
| --- | --- |
| Settings (`settings.json`) | Yes |
| Keyboard shortcuts (`keybindings.json`) | Yes |
| Extensions | Yes, after confirmation |
| Snippets | Yes |
| IDE layout | Yes, with a preview and local backup |

Profiles are stored in Google Drive's private `appDataFolder` space. They do not appear among your regular Drive files and can only be accessed by this authorized application.

## Installation

### From Open VSX

Search for **Sync Antigravity** in Antigravity's Extensions panel or open the [extension page on Open VSX](https://open-vsx.org/extension/lksferreira/sync-antigravity).

### From a VSIX file

1. Download the `.vsix` file from the project's [releases page](https://github.com/LKSFerreira/sync-antigravity/releases).
2. In Antigravity, open **Extensions**.
3. Open the `...` menu and select **Install from VSIX**.
4. Select the downloaded file.

## First use

1. Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P`.
2. Run **Sync Antigravity: Open dashboard**, or select **Sync Antigravity** in the status bar.
3. Select **Sign in with Google** and complete the authorization in your browser.
4. Back in the dashboard, create a profile with a recognizable name, such as `Personal laptop`.
5. Choose the items you want to include and upload the profile.

On another computer, install the extension, sign in to the **same Google Account**, open the dashboard, and select **Apply** on the desired profile. The extension automatically detects the current Antigravity installation paths, displays a preview before changing data, and asks for confirmation before installing or removing extensions. Reload the window when prompted.

## Security and privacy

- The extension requests only the Google Drive `drive.appdata` scope.
- OAuth tokens are stored in the IDE's local secure storage (`SecretStorage`), never in a synchronized profile or in the repository.
- Layout data is filtered through an allowlist of visual keys and backed up locally before restoration.
- Remote data is validated before it can affect local settings.

Read the [Privacy Policy](https://sync.semsusto.app/privacidade/) and [Terms of Service](https://sync.semsusto.app/termos/).

## Help

| Command | Purpose |
| --- | --- |
| **Sync Antigravity: Open dashboard** | Opens the login and profiles dashboard. |
| **Sync Antigravity: Restore latest layout** | Restores the most recent local layout backup. |

If something does not work as expected, [open a GitHub issue](https://github.com/LKSFerreira/sync-antigravity/issues) and include the Antigravity version, extension version, and steps to reproduce the problem. Do not submit tokens, credentials, or configuration files containing sensitive data.

## Project and development

The [public website](https://sync.semsusto.app/) covers installation and first use. Source code, technical documentation, contribution instructions, and the release process are available in the [project repository](https://github.com/LKSFerreira/sync-antigravity).

- [Feature documentation](https://github.com/LKSFerreira/sync-antigravity/blob/main/FEATURES.md)
- [Development guide](https://github.com/LKSFerreira/sync-antigravity/blob/main/docs/DESENVOLVIMENTO.md)
- [Release notes](https://github.com/LKSFerreira/sync-antigravity/blob/main/CHANGELOG.md)
- [Roadmap](https://github.com/LKSFerreira/sync-antigravity/blob/main/ROADMAP.md)

## License

[MIT](LICENSE.md)
