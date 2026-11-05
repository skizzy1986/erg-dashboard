<!-- Carried over verbatim from the squat-anatomy source project (docs/REFERENCES.md, v3, 2026-11-04). The squat tool's content test pins its numbers against this file — edit the two together. -->

# Reference values used in the page

Each row lists a value as the source reports it, how the page uses it, and the citation. Check definitions before comparing: studies report included angles (180° = straight), trunk–thigh angles or pelvis–femur angles.

| Quantity | Published value | Used for | Source |
|---|---|---|---|
| Peak hip and knee moments, deep high-bar squat, 65% 1RM | Hip 230 N·m, knee 191 N·m (ratio ≈ 1.2). Low-bar: hip 324, knee 139 (≈ 2.3) | Hip-to-knee ratio target | Wretenberg, Feng, Arborelius 1996, *Med Sci Sports Exerc* 28(2):218–224. https://pubmed.ncbi.nlm.nih.gov/8775157 |
| Full back squat mean velocity vs load (n = 80) | 50% 1.08, 60% 0.95, 70% 0.82, 80% 0.67, 90% 0.50, 95% 0.42, 1RM 0.32 m/s | Reference rep speed (0.61 m/s ≈ 80–85%), importer %1RM estimate, grey reference line | Sánchez-Medina et al. 2017, *Sports Med Int Open* 1:E80–E88. https://www.thieme-connect.de/products/ejournals/pdf/10.1055/s-0043-102933.pdf |
| Sticking region, last rep of a 6RM full squat (n = 11) | Starts 0.08 ± 0.02 m above the bottom (0.31 s, 0.39 m/s, knee 81.5° included), ends 0.22 ± 0.07 m (0.85 s, 0.24 m/s, knee 102.7° included) | Sticking band (8–22 cm), guide text | A kinematic analysis of the sticking region in full back squats, ISBS Proceedings 2014. https://ojs.ub.uni-konstanz.de/cpa/article/view/6649 |
| EMG around the sticking region | Gluteal activity rises into the region; rectus femoris falls each phase; vastus lateralis falls after it | Guide text; drive activation held through the region | Kinesiologia Slovenica 2015, 21(1):15–25. https://www.sponet.de/Record/4037610 |
| High-bar lifters at 100% 1RM (weightlifters) | Knee peak flexion 56 ± 7° included (≈ 124° flexion); hip 71 ± 9° included (trunk–thigh); ankle range 32 ± 3° | Knee bracket on the angles graph, ankle check | Glassbrook 2019, AUT thesis. https://openrepository.aut.ac.nz/items/dfd50d9d-184a-470b-a677-0039c63c55bd |
| Bar position vs centre of pressure at the deepest point | High-bar about 21 ± 36 mm behind the centre of pressure; low-bar about 55 ± 39 mm | Bar-over-midfoot context; open question in ARCHITECTURE §4 | Glassbrook 2019 (above) |
| Back squat assessment criteria | Head, chest, lordotic lumbar curve, level hips, knees over toes, tibia parallel with trunk, whole foot down, controlled descent, thighs at least parallel, torso upright on ascent | Form check items, guide | Myer et al. 2014, *Strength Cond J* 36(6):4–27. https://pubmed.ncbi.nlm.nih.gov/25506270/ |
| Lumbar flexion during descent, trained lifters, +50% BW | Men 25–26°, women about 13° | Lower-back check (13–26°) | McKean, Dunn, Burkett 2010, *J Strength Cond Res* 24(10):2731–2741. https://research.usc.edu.au/esploro/outputs/journalArticle/The-Lumbar-and-Sacrum-Movement-Pattern/99449802702621 |
| Motor-unit firing, vastus medialis and lateralis | Higher firing rates in concentric than eccentric squat phases | Phase activation rationale | Orantes-Gonzalez et al. 2023, *Sports Biomechanics*. https://knowledge.lancashire.ac.uk/id/eprint/47042/ |
| Eccentric activation strategy | Less EMG per unit force when lengthening | Mode factor 0.62 | Enoka 1996, *J Appl Physiol* 81(6):2339–2346 |
| Segment parameters | Male mass fractions and COM locations | Kinetics | de Leva 1996, *J Biomech* 29(9):1223–1230 |
| Joint coordinate systems | Humerothoracic YXY; thorax frame from IJ/PX/C7/T8 | Shoulder angles | Wu et al. 2005, *J Biomech* 38(5):981–992 |
| Activation calibration (from v2) | Squat surface EMG | Activation formulas in `act3.py` | Contreras et al. 2015; Caterisano et al. 2002; Hammond et al. 2016; van den Tillaar et al. 2019 |
| Competition depth | Hip crease below the top of the knee | Depth check | IPF technical rules |

## Open data that could replace modelled curves

- OpenCap lab validation set (SimTK project 2385): 10 subjects; squats, sit-to-stand, drop jumps and walking; markers, ground force, EMG from 10 lower-limb muscles, and OpenSim inverse kinematics and dynamics. `LabValidation_withoutVideos.zip` is 2.9 GB. https://simtk.org/frs/?group_id=2385
- Scherpereel et al. 2023, *Sci Data* 10:924: 12 subjects; squats holding a 25 lb weight; motion capture at 200 Hz, force plates, 8-muscle bilateral EMG, OpenSim moments. https://doi.org/10.1038/s41597-023-02840-6
- AddBiomechanics dataset: large processed motion capture plus ground force, including squats. https://addbiomechanics.org/download_data.html

All three are bodyweight or lightly loaded. Use them for curve shape, timing and the lowering-versus-driving EMG pattern, not for loaded magnitudes.
