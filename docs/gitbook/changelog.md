## [1.5.1](https://github.com/taskforcesh/bullmq-proxy/compare/v1.5.0...v1.5.1) (2024-11-18)


### Bug Fixes

* **deps:** upgrade dependencies ([0bed980](https://github.com/taskforcesh/bullmq-proxy/commit/0bed980ad7e92a4b197ba29ada3ee6d1f18f3f5e))

# [1.5.0](https://github.com/taskforcesh/bullmq-proxy/compare/v1.4.1...v1.5.0) (2024-11-18)


### Features

* upgrade bullmq to 5.26.2 ([141dce5](https://github.com/taskforcesh/bullmq-proxy/commit/141dce57c51bb1104697de96598fdaa1c957d6cd))

## [1.4.1](https://github.com/taskforcesh/bullmq-proxy/compare/v1.4.0...v1.4.1) (2024-11-18)


### Bug Fixes

* add a cleanURI function to fix params with special characters ([#26](https://github.com/taskforcesh/bullmq-proxy/issues/26)) ([9980f9e](https://github.com/taskforcesh/bullmq-proxy/commit/9980f9e7a8b1724a2d9fb2013e0ea0de2fab186e))

# [1.4.0](https://github.com/taskforcesh/bullmq-proxy/compare/v1.3.1...v1.4.0) (2024-08-10)


### Features

* **worker:** only support POST, PUT and PATCH verbs ([8975545](https://github.com/taskforcesh/bullmq-proxy/commit/8975545a635f9f650a1f088760cce3859236edc0))

## [1.3.1](https://github.com/taskforcesh/bullmq-proxy/compare/v1.3.0...v1.3.1) (2024-08-09)


### Bug Fixes

* upgrade bullmq dependency ([b65c055](https://github.com/taskforcesh/bullmq-proxy/commit/b65c055b96f7fbe47b174aa23615645454846f51))

# [1.3.0](https://github.com/taskforcesh/bullmq-proxy/compare/v1.2.0...v1.3.0) (2024-03-20)


### Features

* support proxy concurrency ([#18](https://github.com/taskforcesh/bullmq-proxy/issues/18)) ([d7ad35a](https://github.com/taskforcesh/bullmq-proxy/commit/d7ad35a90718fdf4e8c5eae0ec26e2961ad44579))

# [1.2.0](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.9...v1.2.0) (2024-03-03)


### Features

* gracefullier close & add  dedicated workers connection ([1e0c023](https://github.com/taskforcesh/bullmq-proxy/commit/1e0c0238d03d4e5f8cfd84da70f0b725e16f49b8))

## [1.1.9](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.8...v1.1.9) (2024-02-29)


### Bug Fixes

* **config:** use the more standard REDIS_URL env instead of REDIS_URI ([bb40b57](https://github.com/taskforcesh/bullmq-proxy/commit/bb40b577d73e725244c8a081aa3f0241d148dece))

## [1.1.8](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.7...v1.1.8) (2024-02-29)


### Bug Fixes

* **docker-build:** downgrade docker/build-push-action to v4 ([8d5edec](https://github.com/taskforcesh/bullmq-proxy/commit/8d5edecfb3614ba4ece1537c028eded621cb9b4d))

## [1.1.7](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.6...v1.1.7) (2024-02-29)


### Bug Fixes

* **docker-build:** remove unneeded checkout action ([5127486](https://github.com/taskforcesh/bullmq-proxy/commit/5127486b509f663495cfb11c22d736234ad0a2de))

## [1.1.6](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.5...v1.1.6) (2024-02-29)


### Bug Fixes

* **docker-build:** disable build cache ([2afa0ad](https://github.com/taskforcesh/bullmq-proxy/commit/2afa0ad3505b73d8a868bc7516859e53ce166790))

## [1.1.5](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.4...v1.1.5) (2024-02-29)


### Bug Fixes

* **docker-build:** ignore scripts when installing bun dependencies ([41e598e](https://github.com/taskforcesh/bullmq-proxy/commit/41e598e2eaab3bcfa8c80ff9b0c38d96e499db33))

## [1.1.4](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.3...v1.1.4) (2024-02-29)


### Bug Fixes

* **docker-build:** fix docker image tags ([ff3bdd5](https://github.com/taskforcesh/bullmq-proxy/commit/ff3bdd537ba595848d44f91e23abc346b5fea1c2))

## [1.1.3](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.2...v1.1.3) (2024-02-29)


### Bug Fixes

* **docker-build:** use GHA built in docker layers cache ([0dd9c31](https://github.com/taskforcesh/bullmq-proxy/commit/0dd9c3134f7aa2a2771dba4446259831cc124f24))

## [1.1.2](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.1...v1.1.2) (2024-02-29)


### Bug Fixes

* create image using production files ([c939ed6](https://github.com/taskforcesh/bullmq-proxy/commit/c939ed6461ac8f54074809cb182414c3fb12e11c))

## [1.1.1](https://github.com/taskforcesh/bullmq-proxy/compare/v1.1.0...v1.1.1) (2024-02-29)


### Bug Fixes

* fix trigger for docker image build ([b5507e6](https://github.com/taskforcesh/bullmq-proxy/commit/b5507e62bc3389c8c0ff2326f2bf7a23abcefeb3))

# [1.1.0](https://github.com/taskforcesh/bullmq-proxy/compare/v1.0.0...v1.1.0) (2024-02-29)


### Bug Fixes

* correct end offset of pages on get jobs and get logs ([8c12825](https://github.com/taskforcesh/bullmq-proxy/commit/8c1282596f8f96de7807d65171e98c9228b5637e))


### Features

* **workers:** add support for updating job progress and add job logs ([f4b342e](https://github.com/taskforcesh/bullmq-proxy/commit/f4b342e90842177270479a60625b0f6bc963147f))

# 1.0.0 (2024-02-26)


### Bug Fixes

* **golang:** remove websocket compression ([5c28a42](https://github.com/taskforcesh/bullmq-proxy/commit/5c28a42ef8817b46a11d62a5cedb4c8a87e9e5a9))


### Features

* add getJobCounts ([d138fed](https://github.com/taskforcesh/bullmq-proxy/commit/d138fede24bd08d317a1ab2a17f8f0d289e19329))
* **bun:** add reference client implementation in typescript ([3131dce](https://github.com/taskforcesh/bullmq-proxy/commit/3131dced3a5e95ae650d25cd2c1a05f3560717ac))
* golang client POC ([7641749](https://github.com/taskforcesh/bullmq-proxy/commit/76417496c5cb9feb368e1a0a2a5712d752ef2418))
* initial implementation ([4d248ef](https://github.com/taskforcesh/bullmq-proxy/commit/4d248ef67d315839e34b45fddfa0ac9f8359c0b0))
* initial implementation endpoint based workers ([506d4e6](https://github.com/taskforcesh/bullmq-proxy/commit/506d4e6327b2074d6411b7c330e58ef2da27b025))


### Performance Improvements

* **validators:** outrefactor constants to make them globals ([b84e1d6](https://github.com/taskforcesh/bullmq-proxy/commit/b84e1d6548d597c2ad412dff36949e2b9f93e122))
