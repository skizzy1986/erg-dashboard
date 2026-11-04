# Third-party notices

The code in this repository is proprietary and covered by the root
[`LICENSE`](LICENSE). The files below are not: they are third-party material,
or derived from it, and carry their own terms.

## BodyParts3D — CC BY-SA 2.1 JP

- `web/src/squat/assets/squat-anatomy.bin`
- `web/src/squat/assets/squat-manifest.json`

Anatomical geometry derived from **BodyParts3D**, © The Database Center for
Life Science (DBCLS), <https://lifesciencedb.jp/bp3d/>, licensed under
[CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en).
The derived data in these two files is shared under the same licence; see
`web/src/squat/assets/LICENSE.md`. The squat tool credits BodyParts3D on every
screen that can show the anatomy.

## OpenSim musculoskeletal models

The squat model's leg-muscle paths follow these published models. No model
file (`.osim`) or geometry from them is redistributed here; their paths were
used, in the separate source project, to shape the muscle curves inside the
BodyParts3D-derived data above.

| Model | Citation | Distributed by | Terms (verified 2026-11-04) |
|---|---|---|---|
| Full-body model | Rajagopal A, et al. (2016). Full-body musculoskeletal model for muscle-driven simulation of human gait. *IEEE Trans Biomed Eng*. | SimTK project `full_body` | "MIT Use Agreement" — <https://simtk.org/frs/?group_id=773> |
| Deep-flexion update | Lai AKM, Arnold AS, Wakeling JM (2017). Why are antagonist muscles co-activated in my simulation? *Ann Biomed Eng*. | SimTK project `model-high-flex` | "MIT Use Agreement" — <https://simtk.org/frs/?group_id=1302> |
| OpenCap model | Uhlrich SD, et al. (2022) model, as shipped with OpenCap | `stanfordnmbl/opencap-core` | Apache-2.0 — <https://github.com/stanfordnmbl/opencap-core> |

How the terms above were verified, and what was not:

- **SimTK "MIT Use Agreement" (Rajagopal 2016, Lai 2017).** The label was read on each
  project's SimTK download page (the `frs` links above), where SimTK shows the licence a
  download is offered under. The full text of the agreement itself — normally shown in a
  click-through at download time — was **not** read, so its exact conditions beyond
  that label are unconfirmed.
- **Uhlrich 2022 via `opencap-core`.** The Apache-2.0 entry is the licence of the
  `stanfordnmbl/opencap-core` repository. That this repository is the route by which the
  source project obtained the Uhlrich 2022 model is **unconfirmed** — the model is also
  distributed elsewhere, and the source project does not say which copy it used. If it
  came another way, that route's terms apply instead.

The `opensim-org/opensim-models` repository, which the source project names as
its route to these models, states no licence of its own; the terms above are
those of each model's distributing project. Each asks that the model's paper be
cited, which the tool does in its Sources list.

## Published reference values

Numbers used as targets and reference ranges are facts reported in the cited
papers, listed with citations in `docs/squat/REFERENCES.md` and in the tool's
Sources pane.
