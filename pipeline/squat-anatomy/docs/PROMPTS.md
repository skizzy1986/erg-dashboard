# Prompting Claude Code on this repo

## Brief once per session

> This repo builds a single-file 3D coaching model of a high-bar back squat (`dist/squat.html`). Read `CLAUDE.md`, `README.md` and `docs/ARCHITECTURE.md` first. Do not hand-edit the data blob. Edit `page/` and `pipeline/`, rebuild with `page/assemble.py` + `pipeline/v3/build3.py`, and verify with the headless harness at 1440×900, 1280×820 dark and 390×844 before you report back. Label anything modelled as modelled, and cite a source for every new target or reference range.

## What makes a good request here

- **Name the convention.** For example: "shoulder angles in ISB humerothoracic YXY", "moments per leg except L5/S1", "depth parameter S", "phase 1 = lowering". Ambiguous angle definitions caused the largest error in this project's history (swing–twist mistaken for external rotation).
- **State the acceptance numbers.** For example: "after the change, mean drive speed is 0.61 ± 0.02 m/s and δ at the bottom is still +4.1°". Claude will then check them.
- **Ask for evidence, not assurance.** Ask for screenshots of the changed view, the `evalpage.js` error list (should be empty), and a before/after table of affected readouts.
- **Keep changes reviewable.** One roadmap item per PR. Ask for a short PR description listing changed files, changed numbers, new sources, and anything still modelled.
- **Literature first for new targets.** Ask Claude to search and quote the source (study population, load, depth, how the angle was defined) before adding a range. Converting included angle to flexion (180 − x), or trunk–thigh angle to pelvis–femur angle, is a common trap.

## Templates

**New graph or readout**
> Add a "Joint power" tab (W/kg, hip/knee/ankle, per leg) computed as dynamic moment × joint angular velocity from `META.rep` and `readout`. Follow the `TABS` pattern in `page/4-ui.js` (≤ 4 series, `unitLong`, no on-plot text labels), add a metrics-table row, and verify peak hip power occurs in the drive phase. Screenshots at the three layouts.

**Measured data**
> I've attached `opencap_squats.zip` (OpenCap lab validation, squat trials only). Add a pipeline stage that segments each rep into phases, time-normalises onto the reference rep and stores mean ± SD bands in `META.ref_bands` for knee/hip/ankle angles, net moments and vasti/glute EMG. Draw them as shaded bands labelled "OpenCap lab set, bodyweight squats, n = <subjects>". Don't change the modelled curves.

**Fix or refine anatomy**
> The rotator cuff and biceps long head still come from the v2 pose with a corrective skin. Rebuild supraspinatus, infraspinatus, teres minor, subscapularis and the biceps heads from the BodyParts3D STLs using the deltoid method in `pipeline/v3/upper3.py` (geodesic origin to insertion blend, dual-quaternion skinning). For the biceps, blend scapula → humerus → radius in three segments. Show back and front shoulder close-ups before and after, and confirm the clearance printout is unchanged.

**Variant**
> Add a low-bar preset: bar seated about 5 cm lower on the posterior deltoid and spine of the scapula, wider grip, trunk solved so the bar stays over midfoot. Report trunk lean, hip-to-knee moment ratio (target about 2.3, Wretenberg 1996) and shoulder ER. Keep the high-bar preset byte-identical.

## Review checklist for PRs
- [ ] `dist/squat.html` rebuilt from sources, not edited by hand
- [ ] Screenshots: desktop light, desktop dark, phone
- [ ] `evalpage.js` reports no errors
- [ ] Changed numbers listed with expected vs observed
- [ ] New targets cited in `docs/REFERENCES.md` and in the page's Sources
- [ ] Modelled vs measured labelling intact
