# Fetch the nine compiled designs

**Time-limited.** These URLs expire about an hour after 2026-08-25T08:05Z and
stop working after a few fetches each. If they 403 or 404, ask design to mint a
fresh set — that takes one turn. Do not treat a failure as the files being gone.

Run this from the repo root. Each file is self-contained: one fetch is the whole
design, no relative assets.

```sh
mkdir -p web/.design-sync/designs
cd web/.design-sync/designs

curl -fL -o desktop-planning.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/desktop-planning.html?t=a90bbea88cf14e2a5206ef413a69925c6c05753ebb151285bfa6ffff98e6b822.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654454.fp&direct=1"
curl -fL -o desktop-overview.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/desktop-overview.html?t=70806692739feaae1ee774bba082dd36da38bf2111cef38df45307298378e380.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654455.fp&direct=1"
curl -fL -o desktop-progress.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/desktop-progress.html?t=b44bbec4e61964fa83f18622dd3c08a0f991092cad50cbcd87442171ca3e1fdf.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654455.fp&direct=1"
curl -fL -o desktop-body.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/desktop-body.html?t=c2ebed8412c164293e2bd047661d2ce6afdb3c44fa7c0be1bed296592366bbb2.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654456.fp&direct=1"

curl -fL -o today.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/today.html?t=fc727abe0b9dadc7491841cfc9233144a04b0549d31d615a9d28b1d226b8fa28.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654459.fp&direct=1"
curl -fL -o progress.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/progress.html?t=eae2a75b8895f214b17521c3e1360cec50773a9d72f709b0d8357512b8de530e.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654461.fp&direct=1"
curl -fL -o train.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/train.html?t=679e5853ad6a3e4995efd424e8b34170c85ca3d786c0cfd0f9d044093cbe12c2.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654461.fp&direct=1"
curl -fL -o body.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/body.html?t=60b9cb78d01280b2a725ceefb3b5d36cb917ca224552769e1e9e1053b0f34676.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654462.fp&direct=1"
curl -fL -o coach.html "https://47056354-07bf-4a77-a642-6bdf4c3a941d.claudeusercontent.com/v1/design/projects/47056354-07bf-4a77-a642-6bdf4c3a941d/serve/design-sync-docs/designs/coach.html?t=c7215f626ca6bce3484be72f1afa26f60fbc0e470a336e9a0269b7c85e5a9660.fd876795-ba23-4d97-82d2-a64eb85bed1e.402818b5-0d4f-4a41-82c0-e6e2defb5361.1787654462.fp&direct=1"
```

Sanity check before committing — each should be 0.7–1.7 MB and start with
`<!DOCTYPE html>`:

```sh
ls -lh *.html
head -c 60 desktop-planning.html
```

A file under 10 KB is an error page, not a design. Delete it and ask for a fresh
URL rather than committing it.

## What they are

Snapshots for reading and review, not an implementation reference — the design
project uses inline styles throughout and has no relationship to the app's
component tree. Take values, layout and behaviour from them; take structure from
`HANDOFF.md` §4, which states every decision they encode in words.

| File | Screen |
| --- | --- |
| `today.html` | Today (mobile) |
| `progress.html` | Progress (mobile) |
| `train.html` | Train (mobile) — five states |
| `body.html` | Body (mobile) |
| `coach.html` | Coach (mobile) |
| `desktop-overview.html` | Desktop overview — **1b Ledger** is the chosen direction, 1a kept below for reference |
| `desktop-progress.html` | Desktop Progress — four panes, the four tooltip components |
| `desktop-body.html` | Desktop Body — readiness waterfall, 28-day reconstruction |
| `desktop-planning.html` | Desktop Planning — season phase table, home/FIFO discipline split |
