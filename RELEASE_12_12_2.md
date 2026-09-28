# AnimeTrack 12.12.2 — safe PWA updates with pending cloud sync

- A pending cloud upload no longer blocks installing a new AnimeTrack version when the latest library snapshot and sync journal are already stored locally.
- Reload remains blocked while a cloud write is actively in flight or when the local mirror could not be written because storage is full.
- After reload, the existing durable journal is restored and the cloud upload retries normally; pending progress is not discarded.
- The update warning now describes the actual unsafe conditions instead of treating every pending cloud change as data loss.
- Service-worker cache and release version bumped to 12.12.2.
