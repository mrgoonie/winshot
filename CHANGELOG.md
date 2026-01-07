## [1.4.1](https://github.com/mrgoonie/winshot/compare/v1.4.0...v1.4.1) (2025-12-24)


### Bug Fixes

* **release:** add @semantic-release/npm plugin to update package.json version ([#58](https://github.com/mrgoonie/winshot/issues/58)) ([69eedce](https://github.com/mrgoonie/winshot/commit/69eedce30d2154f22ace38a581e88db59605c722))

# [1.4.0](https://github.com/mrgoonie/winshot/compare/v1.3.0...v1.4.0) (2025-12-24)


### Features

* **annotation:** implement tapered arrow shapes with curve support ([363f471](https://github.com/mrgoonie/winshot/commit/363f471fb826e808801b712435bc1c32dae78429))

# [1.3.0](https://github.com/mrgoonie/winshot/compare/v1.2.0...v1.3.0) (2025-12-24)


### Bug Fixes

* **startup:** resolve minimize to tray and autostart issues ([#48](https://github.com/mrgoonie/winshot/issues/48)) ([1024bf0](https://github.com/mrgoonie/winshot/commit/1024bf07001111a7171cbaaf61f4be49876ec057))


### Features

* **annotation:** implement tapered arrow shapes with curve support ([363f471](https://github.com/mrgoonie/winshot/commit/363f471fb826e808801b712435bc1c32dae78429))
* **clipboard:** add Ctrl+V paste and JPEG quality export ([#48](https://github.com/mrgoonie/winshot/issues/48)) ([fe09cce](https://github.com/mrgoonie/winshot/commit/fe09cce30ca37f92134e193ce3b235624e405558))
* **clipboard:** add multi-format paste and drag-drop image import ([c9700b6](https://github.com/mrgoonie/winshot/commit/c9700b6dd155c2eaf91f3f43aa576c0beb1cc384))
* **notifications:** add capture notifications and copy path button ([#48](https://github.com/mrgoonie/winshot/issues/48)) ([8b3e94a](https://github.com/mrgoonie/winshot/commit/8b3e94a4eb9d88909c612f9708cfcc28f464065c))

# [1.2.0-beta.7](https://github.com/mrgoonie/winshot/compare/v1.2.0-beta.6...v1.2.0-beta.7) (2025-12-24)


### Bug Fixes

* **startup:** resolve minimize to tray and autostart issues ([#48](https://github.com/mrgoonie/winshot/issues/48)) ([1024bf0](https://github.com/mrgoonie/winshot/commit/1024bf07001111a7171cbaaf61f4be49876ec057))


### Features

* **clipboard:** add Ctrl+V paste and JPEG quality export ([#48](https://github.com/mrgoonie/winshot/issues/48)) ([fe09cce](https://github.com/mrgoonie/winshot/commit/fe09cce30ca37f92134e193ce3b235624e405558))
* **clipboard:** add multi-format paste and drag-drop image import ([c9700b6](https://github.com/mrgoonie/winshot/commit/c9700b6dd155c2eaf91f3f43aa576c0beb1cc384))
* **notifications:** add capture notifications and copy path button ([#48](https://github.com/mrgoonie/winshot/issues/48)) ([8b3e94a](https://github.com/mrgoonie/winshot/commit/8b3e94a4eb9d88909c612f9708cfcc28f464065c))

# [1.2.0](https://github.com/mrgoonie/winshot/compare/v1.1.0...v1.2.0) (2025-12-14)


### Bug Fixes

* **app:** restore window position after region capture ([38e1191](https://github.com/mrgoonie/winshot/commit/38e119109376f84e451322ba84a1d8edd0583d34))
* **ci:** detect merge commits as releasable for PR-based workflow ([c22be25](https://github.com/mrgoonie/winshot/commit/c22be252d78c5f0b33f9965bac331bf6c1d61861))
* **ci:** exclude merge commits from release check ([32e0540](https://github.com/mrgoonie/winshot/commit/32e054025de5a8f95d683e7e5069637eb8a22670))
* **hotkeys:** resolve goroutine thread affinity causing hotkey registration failure ([1d683cc](https://github.com/mrgoonie/winshot/commit/1d683ccaffa9043b235fdaf8e3e88bd89ca295e0))
* **output:** include padding in auto mode dimensions calculation ([8f07694](https://github.com/mrgoonie/winshot/commit/8f07694f9e74f6d6877781b60220c47b4bbdd5ac))
* **quick-save:** use configured folder instead of hardcoding save directory ([d868093](https://github.com/mrgoonie/winshot/commit/d868093ae7173e8647ccaba8c38751e50fca6879))
* resolve 3 bugs from issue [#21](https://github.com/mrgoonie/winshot/issues/21) ([9652b5b](https://github.com/mrgoonie/winshot/commit/9652b5b12697b7d2cee74622d68acdcf5eafb62d))
* resolve merge conflicts from Vivusk/winshot PR [#36](https://github.com/mrgoonie/winshot/issues/36) ([2515593](https://github.com/mrgoonie/winshot/commit/25155933a02dc995eb9d84f11665acbefacfe878))
* **settings:** migrate background images from localStorage to backend config ([bfa2744](https://github.com/mrgoonie/winshot/commit/bfa27442f2ac80791a45443458064864692bdab0))
* **startup:** minimize app window on startup when configured ([3f5f4d1](https://github.com/mrgoonie/winshot/commit/3f5f4d1a7b87e12209e18ba5a0f125bfa0511290)), closes [#31](https://github.com/mrgoonie/winshot/issues/31)
* **tray:** resolve quit button not working in tray context menu ([a459568](https://github.com/mrgoonie/winshot/commit/a45956844472465b18c8893d6c9ac3f6b8e4da03))


### Features

* add background visibility toggle and improve overlay focus ([39fadf3](https://github.com/mrgoonie/winshot/commit/39fadf3e59c211adc0d56f604266282302d8a80e))
* **annotations:** implement undo/redo with keyboard shortcuts ([94ed01c](https://github.com/mrgoonie/winshot/commit/94ed01c486628da51398e587edb1fb497f669bf5))
* **capture:** add clipboard image paste support ([03cf0fd](https://github.com/mrgoonie/winshot/commit/03cf0fd0698e5f199965fa3c923eec469a2c341e))
* **capture:** add multi-monitor region capture support ([0f1a8d1](https://github.com/mrgoonie/winshot/commit/0f1a8d123162d701baa35f4b121b505fd069a5d3))
* **clipboard:** auto-copy styled canvas instead of raw screenshot ([20ad92b](https://github.com/mrgoonie/winshot/commit/20ad92b2ef56359aff04cdd299f49146d4820474))
* **editor:** copy rendered canvas with applied settings to clipboard ([dbe91dd](https://github.com/mrgoonie/winshot/commit/dbe91dd824be72d14812bde88b06d7c90d305f1e))
* **overlay:** implement native Win32 region selection overlay ([22da2ac](https://github.com/mrgoonie/winshot/commit/22da2acdc2ba59b15fbc70098d97729336ef2b0f))
* **update:** implement auto-update feature for GitHub Releases ([96194ef](https://github.com/mrgoonie/winshot/commit/96194ef13e13b909f3fb16cf0b025a56005041c0))

# [1.2.0-beta.6](https://github.com/mrgoonie/winshot/compare/v1.2.0-beta.5...v1.2.0-beta.6) (2025-12-14)


### Bug Fixes

* **app:** restore window position after region capture ([38e1191](https://github.com/mrgoonie/winshot/commit/38e119109376f84e451322ba84a1d8edd0583d34))
* **ci:** detect merge commits as releasable for PR-based workflow ([c22be25](https://github.com/mrgoonie/winshot/commit/c22be252d78c5f0b33f9965bac331bf6c1d61861))
* **ci:** exclude merge commits from release check ([32e0540](https://github.com/mrgoonie/winshot/commit/32e054025de5a8f95d683e7e5069637eb8a22670))


### Features

* **update:** implement auto-update feature for GitHub Releases ([96194ef](https://github.com/mrgoonie/winshot/commit/96194ef13e13b909f3fb16cf0b025a56005041c0))

# [1.2.0-beta.5](https://github.com/mrgoonie/winshot/compare/v1.2.0-beta.4...v1.2.0-beta.5) (2025-12-13)


### Bug Fixes

* **hotkeys:** resolve goroutine thread affinity causing hotkey registration failure ([1d683cc](https://github.com/mrgoonie/winshot/commit/1d683ccaffa9043b235fdaf8e3e88bd89ca295e0))
* **output:** include padding in auto mode dimensions calculation ([8f07694](https://github.com/mrgoonie/winshot/commit/8f07694f9e74f6d6877781b60220c47b4bbdd5ac))
* **quick-save:** use configured folder instead of hardcoding save directory ([d868093](https://github.com/mrgoonie/winshot/commit/d868093ae7173e8647ccaba8c38751e50fca6879))
* resolve 3 bugs from issue [#21](https://github.com/mrgoonie/winshot/issues/21) ([9652b5b](https://github.com/mrgoonie/winshot/commit/9652b5b12697b7d2cee74622d68acdcf5eafb62d))
* **settings:** migrate background images from localStorage to backend config ([bfa2744](https://github.com/mrgoonie/winshot/commit/bfa27442f2ac80791a45443458064864692bdab0))
* **startup:** minimize app window on startup when configured ([3f5f4d1](https://github.com/mrgoonie/winshot/commit/3f5f4d1a7b87e12209e18ba5a0f125bfa0511290)), closes [#31](https://github.com/mrgoonie/winshot/issues/31)
* **tray:** resolve quit button not working in tray context menu ([a459568](https://github.com/mrgoonie/winshot/commit/a45956844472465b18c8893d6c9ac3f6b8e4da03))


### Features

* add background visibility toggle and improve overlay focus ([39fadf3](https://github.com/mrgoonie/winshot/commit/39fadf3e59c211adc0d56f604266282302d8a80e))
* **annotations:** implement undo/redo with keyboard shortcuts ([94ed01c](https://github.com/mrgoonie/winshot/commit/94ed01c486628da51398e587edb1fb497f669bf5))
* **capture:** add clipboard image paste support ([03cf0fd](https://github.com/mrgoonie/winshot/commit/03cf0fd0698e5f199965fa3c923eec469a2c341e))
* **capture:** add multi-monitor region capture support ([0f1a8d1](https://github.com/mrgoonie/winshot/commit/0f1a8d123162d701baa35f4b121b505fd069a5d3))
* **clipboard:** auto-copy styled canvas instead of raw screenshot ([20ad92b](https://github.com/mrgoonie/winshot/commit/20ad92b2ef56359aff04cdd299f49146d4820474))
* **editor:** copy rendered canvas with applied settings to clipboard ([dbe91dd](https://github.com/mrgoonie/winshot/commit/dbe91dd824be72d14812bde88b06d7c90d305f1e))
* **overlay:** implement native Win32 region selection overlay ([22da2ac](https://github.com/mrgoonie/winshot/commit/22da2acdc2ba59b15fbc70098d97729336ef2b0f))

# [1.2.0-beta.4](https://github.com/mrgoonie/winshot/compare/v1.2.0-beta.3...v1.2.0-beta.4) (2025-12-12)


### Bug Fixes

* resolve merge conflicts from Vivusk/winshot PR [#36](https://github.com/mrgoonie/winshot/issues/36) ([2515593](https://github.com/mrgoonie/winshot/commit/25155933a02dc995eb9d84f11665acbefacfe878))

# [1.2.0-beta.3](https://github.com/mrgoonie/winshot/compare/v1.2.0-beta.2...v1.2.0-beta.3) (2025-12-12)


### Features

* add background visibility toggle and improve overlay focus ([8fc91e2](https://github.com/mrgoonie/winshot/commit/8fc91e2ac1d55a3fba3f29b34aed1f2e23a5a9a6))

# [1.2.0-beta.2](https://github.com/mrgoonie/winshot/compare/v1.2.0-beta.1...v1.2.0-beta.2) (2025-12-12)


### Features

* **annotations:** implement undo/redo with keyboard shortcuts ([d5d6a9e](https://github.com/mrgoonie/winshot/commit/d5d6a9e1b9eb63e61a0d1f81de1f61a5cce9a3d7))

# [1.2.0-beta.1](https://github.com/mrgoonie/winshot/compare/v1.1.0...v1.2.0-beta.1) (2025-12-12)


### Features

* **capture:** add clipboard image paste support ([a00bc3b](https://github.com/mrgoonie/winshot/commit/a00bc3beeab32d900b393e50b77e8acc1bc9a2b5))
* **overlay:** implement native Win32 region selection overlay ([caf8dca](https://github.com/mrgoonie/winshot/commit/caf8dcaac37f38b8ad94f63af36cdd8e5ddbd393))

# [1.1.0](https://github.com/mrgoonie/winshot/compare/v1.0.2...v1.1.0) (2025-12-11)


### Bug Fixes

* ensure consistent hotkey display in both config and app ([93f3a0f](https://github.com/mrgoonie/winshot/commit/93f3a0f4b386dadb72e2e88b21f64f14f9f78f3e))
* handle empty screenshot gracefully with user notification ([7aed78f](https://github.com/mrgoonie/winshot/commit/7aed78fd0de53d95c6af21492df1bd5ed58e00b7))
* resolve settings modal hotkey editing issues ([9eabb5c](https://github.com/mrgoonie/winshot/commit/9eabb5c7ef8a0d42a4c63bde4a3f0065e8d9e65d))


### Features

* add version display and update checking functionality ([b474dd2](https://github.com/mrgoonie/winshot/commit/b474dd283e8d5f394bdcb3dc4f930b1e51b1b29b))

## [1.0.2](https://github.com/mrgoonie/winshot/compare/v1.0.1...v1.0.2) (2025-12-10)


### Bug Fixes

* bind configurable hotkeys to fullscreen, region, and window capture ([39a98c0](https://github.com/mrgoonie/winshot/commit/39a98c073ad22108c6ea3d51f7a51f34e0ff19ec))

## [1.0.1](https://github.com/mrgoonie/winshot/compare/v1.0.0...v1.0.1) (2025-12-09)


### Bug Fixes

* resolve Wails v3 dev server issues with frontend DevServer configuration ([22e6cb0](https://github.com/mrgoonie/winshot/commit/22e6cb0f2c50b87e83a1fca94f5f0efb5e84a520))

# 1.0.0 (2025-12-09)


### Features

* **capture:** add fullscreen, region, and window capture functionality ([a4f3c8f](https://github.com/mrgoonie/winshot/commit/a4f3c8f7e8c9c2b1b6e1e4f7a9c2d5e8f0b3c6d9))
* **editor:** add image styling with padding, corners, shadow, and background ([d5e6f7a](https://github.com/mrgoonie/winshot/commit/d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4))
* **export:** add PNG/JPEG export with clipboard support ([e6f7a8b](https://github.com/mrgoonie/winshot/commit/e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5))
* **hotkeys:** add global hotkey configuration ([f7a8b9c](https://github.com/mrgoonie/winshot/commit/f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6))
* **tray:** add system tray support with minimize to tray ([a8b9c0d](https://github.com/mrgoonie/winshot/commit/a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7))
