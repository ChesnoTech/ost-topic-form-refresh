# Changelog

## [1.2.0] - 2026-04-08

### Added
- Minor vs major update channels — admin can see and choose between patch/minor updates (safe) and major updates (may have breaking changes) separately
- All available versions listed per channel with expandable view
- Release date display for each update
- Breaking change warning for major updates with distinct amber styling
- Target-specific update: `doUpdate()` now accepts a `target_tag` parameter to install a specific release version

### Changed
- `checkUpdate()` now returns categorized `minor_update`, `major_update`, `minor_available`, `major_available` arrays
- Backend fetches all releases (`/releases?per_page=50`) instead of only the latest
- Admin UI fully redesigned with channel cards, badges, and styled update panels

## [1.1.0] - 2026-04-07

### Added
- Self-update feature: "Check for Updates" button on plugin settings page
- GitHub API integration for version checking and one-click updates
- `isMultiInstance()` override — plugin works without creating instances
- Admin JS injection on plugin settings page

### Fixed
- Plugin now activates correctly without requiring instance creation

## [1.0.0] - 2026-04-07

### Added
- Initial release
- Proxy AJAX endpoint for help topic form loading (bypasses HTTP_REFERER check)
- Dynamic form field refresh when help topic changes during ticket creation
- Widget reinitialization and data preservation across topic switches
