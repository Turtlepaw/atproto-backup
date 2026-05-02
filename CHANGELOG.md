# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4]

### Added

- Hide the app in macOS dock ([#3](https://github.com/Turtlepaw/atproto-backup/issues/3))
- Refresh backups when focused

### Fixed

- Background backups

## [0.1.5]

### Added

- Multiple accounts: you can now add multiple accounts to the app!

### Changed

- You no longer need to authenticate with your PDS to add an account to back up.
- Incremental blob download: backups now only download new blobs since the last backup, instead of downloading all blobs every time.