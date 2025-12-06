# [1.1.0-beta.2](https://github.com/mrgoonie/winshot/compare/v1.1.0-beta.1...v1.1.0-beta.2) (2025-12-06)


### Bug Fixes

* crop issue ([817c0fa](https://github.com/mrgoonie/winshot/commit/817c0faa04103039e07c9f2d7a0e4ab7753d91b0))
* **crop:** export with correct dimensions and hide overlay during capture ([065fbb3](https://github.com/mrgoonie/winshot/commit/065fbb390b346346c4455c114df8e5e81ba42e0a))
* display version in footer ([66176cd](https://github.com/mrgoonie/winshot/commit/66176cd06267ccc1aaf31c38c560b94f9d0a2844))
* **overlay:** increase window hide delay to prevent capture in screenshots ([5a60329](https://github.com/mrgoonie/winshot/commit/5a6032908e922fc48d323d1e781ae09821575f00))
* **window:** preserve size during capture and improve Wails API usage ([2225710](https://github.com/mrgoonie/winshot/commit/2225710a4d228034ea051e363f613bbfa263b7d6))


### Features

* **annotations:** add draggable control point for curved arrow tension ([b56bc57](https://github.com/mrgoonie/winshot/commit/b56bc5769c95ed46889b1d4c091e22f6cfe7d845))
* **annotations:** implement GitHub [#8](https://github.com/mrgoonie/winshot/issues/8) UX improvements ([12d7358](https://github.com/mrgoonie/winshot/commit/12d735837c2cab292cd9780cdf112b61d163e561))
* **annotations:** implement spotlight feature ([#13](https://github.com/mrgoonie/winshot/issues/13)) ([1a38058](https://github.com/mrgoonie/winshot/commit/1a3805862aecd69770ddf4fe719431a51d2194c3))
* **crop:** add CropToolbar component with aspect ratio controls ([19dc437](https://github.com/mrgoonie/winshot/commit/19dc4377e501ee5c45d941efaa65c3380d09c48a))
* **crop:** add types and state setup for crop feature ([e2ef567](https://github.com/mrgoonie/winshot/commit/e2ef5674adf5ad99c1c5b20a0289721d45462701))
* **crop:** implement CropOverlay component with handles and constraints ([90e8db4](https://github.com/mrgoonie/winshot/commit/90e8db4f014bfd84ae16483a8ba53e64fd4635a2))
* **crop:** integrate crop feature into editor workflow ([225f6a7](https://github.com/mrgoonie/winshot/commit/225f6a75f6dce9565242541eeb3db65d0cb76e9d))
* **display:** implement active monitor detection for multi-monitor support ([711ec33](https://github.com/mrgoonie/winshot/commit/711ec339fc65d0f02931706a5fe938aa9b1cb487))
* implement GitHub [#7](https://github.com/mrgoonie/winshot/issues/7) UX improvements ([7274a4d](https://github.com/mrgoonie/winshot/commit/7274a4dd56598ff6827947f0a2c425cf2a26336e))
* **import:** implement image import from computer (GitHub [#10](https://github.com/mrgoonie/winshot/issues/10)) ([0173594](https://github.com/mrgoonie/winshot/commit/01735945bb9e73a8ec368f38890185c38877fecf))
* **windows:** add thumbnail capture for window selection list ([22b113c](https://github.com/mrgoonie/winshot/commit/22b113c7d06534b66399a63113210952d3773624)), closes [#12](https://github.com/mrgoonie/winshot/issues/12)

# [1.1.0-beta.1](https://github.com/mrgoonie/winshot/compare/v1.0.0...v1.1.0-beta.1) (2025-12-03)


### Features

* **branding:** add vibrant glass logo variations and update app icon ([12e7b19](https://github.com/mrgoonie/winshot/commit/12e7b19d96c151662ef4a420b8a0e99a9656a046))
* **text-annotation:** enhance UX with font controls and auto-edit mode ([b20fdea](https://github.com/mrgoonie/winshot/commit/b20fdea79e203f92726726352ad794ad1cd62631))

# 1.0.0-beta.1 (2025-12-03)


### Bug Fixes

* **annotations:** prevent arrow/line endpoint drag from jumping ([1e2107e](https://github.com/mrgoonie/winshot/commit/1e2107ebd3ccedc7387427a82a2654289f79d611))
* **ci:** clean node_modules before install to fix esbuild platform mismatch ([4939f11](https://github.com/mrgoonie/winshot/commit/4939f1135ca3a4c4fd1ee00767654f723a8241fe))
* **ci:** use npm install instead of npm ci for frontend deps ([c1fdbe2](https://github.com/mrgoonie/winshot/commit/c1fdbe217f5cb5407e9c100561ceb734ef1ea282))
* correct repository URL in package.json ([75904ee](https://github.com/mrgoonie/winshot/commit/75904eea62c5f87ba9d13e6b0157a9387708b742))
* demo screenshot ([a5a8c70](https://github.com/mrgoonie/winshot/commit/a5a8c70414e57333a022ef376fb02a46f9f1404c))
* max corner radius 200 ([beda413](https://github.com/mrgoonie/winshot/commit/beda413783160754d43ebcd38f01933f7641621a))
* region capture issue ([2e80755](https://github.com/mrgoonie/winshot/commit/2e80755d69ce516585e5c8babeb99de6d088dcc2))
* **settings:** persist background images using backend storage ([7bd8c87](https://github.com/mrgoonie/winshot/commit/7bd8c87b197fd4fa1879b2de95a62051f12d65fa))
* stroke width settings ([25b7699](https://github.com/mrgoonie/winshot/commit/25b769920c81ebf4b1178d2db2e1c5d0310921dd))
* transform issue ([77406a3](https://github.com/mrgoonie/winshot/commit/77406a30e56512955808c38de8ab49fe85f831d4))
* window resize persistent ([7977f4a](https://github.com/mrgoonie/winshot/commit/7977f4adcc49b63d760c155d894a644d8d530d3d))


### Features

* add custom title bar for frameless window ([5acf087](https://github.com/mrgoonie/winshot/commit/5acf08765230685b7f53fc4f296aa4bcfc642ec2))
* add region capture, fix DPI scaling, enhance editor controls ([59eb82f](https://github.com/mrgoonie/winshot/commit/59eb82f9ce8fd39c1844af6acc37db17ec088774))
* **branding:** add vibrant glass logo variations and update app icon ([12e7b19](https://github.com/mrgoonie/winshot/commit/12e7b19d96c151662ef4a420b8a0e99a9656a046))
* **editor:** enhance screenshot editing with improved window capture ([2043067](https://github.com/mrgoonie/winshot/commit/204306720492c6451a2985bd074c1709a514567f))
* improve DPI scaling and add persistent image gallery ([59ff7c2](https://github.com/mrgoonie/winshot/commit/59ff7c22b8c210650ba7b6467ae3a41bbe3e04fc)), closes [hi#DPI](https://github.com/hi/issues/DPI)
* output ratio ([a31a06c](https://github.com/mrgoonie/winshot/commit/a31a06c9a54d03026b06287d5330ef8ea008e7ff))
* persist window size and fix aspect ratio handling in editor ([01af006](https://github.com/mrgoonie/winshot/commit/01af0060ca0596e57c0adbedc5857b847f6dd309))
* **settings:** add settings page for hotkeys, startup, quicksave, export ([2e8436e](https://github.com/mrgoonie/winshot/commit/2e8436ec26a01d1199ad9b08f5c858b846832147))
* **settings:** expand gradient presets with 12 new themed options ([7cb9d56](https://github.com/mrgoonie/winshot/commit/7cb9d5688a4764e6f0a8e6cfc1557c41a6fa34af))
* **ui:** implement Vibrant Glassmorphism design system ([35b45a2](https://github.com/mrgoonie/winshot/commit/35b45a2afe28fdd6d074c76b5a90190da8e3b2b9))

# Changelog

All notable changes to this project will be documented in this file.

This changelog is automatically generated by [semantic-release](https://github.com/semantic-release/semantic-release).
