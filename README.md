# AutoScroller

AutoScroller is a Chrome extension for smooth hands-free reading on long pages and PDFs. It adds a cleaner popup, a compact in-page control dock, keyboard shortcuts, optional voice commands, and persistent per-browser settings.

## Highlights

- Smooth auto-scroll powered by `requestAnimationFrame`
- In-page dock with start or pause, speed controls, auto-start, and voice toggle
- Popup that reflects the real state of the active tab instead of guessing
- Keyboard shortcuts in page:
  - `Alt + S` start or pause
  - `Alt + [` decrease speed
  - `Alt + ]` increase speed
- Optional voice commands:
  - `start`
  - `pause`
  - `faster`
  - `slower`
- Better end-of-page handling so scrolling stops cleanly instead of running forever

## What's New In 1.1.0

- Rebuilt the popup UI with clearer hierarchy and live tab status
- Replaced the old floating control stack with a cleaner dock and compact mode
- Improved scrolling behavior on long pages and scroll containers
- Added in-page keyboard shortcuts
- Tightened voice control startup, restart, and failure handling
- Refreshed the GitHub-facing docs for the repo landing page

## Install Locally

1. Open `chrome://extensions`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder:
   - `/Users/kylerniemann/Documents/GitHub/autoscroller`

## Use It

1. Open any standard webpage or PDF.
2. Click the extension icon to open the popup.
3. Start scrolling from the popup or from the in-page dock.
4. Adjust speed from the popup or the dock.
5. Enable `Auto-start` if you want scrolling to begin automatically on supported pages.
6. Enable `Voice control` if you want microphone-driven commands.

## Notes

- Chrome internal pages such as `chrome://` and the Chrome Web Store do not allow content scripts, so the popup will show those tabs as unsupported.
- Voice control depends on browser speech recognition support and microphone permissions.
- The extension is currently source-only; load it unpacked from this repo.

## Files

- `manifest.json`: extension manifest and version
- `popup.html`: popup UI
- `popup.js`: popup state and tab messaging
- `content.js`: in-page dock, scrolling engine, shortcuts, and voice handling

## Release

Release notes live in [CHANGELOG.md](./CHANGELOG.md). The GitHub release for `v1.1.0` packages the extension source as a zip asset for easy download.
