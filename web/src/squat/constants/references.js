// The fifteen sources the tool cites, verbatim and in order from the source
// page's Sources pane. `citation` uses the segment format from
// constants/guide.js ({ i } for journal titles). `usedFor` is the "Used for"
// column of docs/squat/REFERENCES.md where that table covers the source.
export const REFERENCES = [
  {
    id: 'wretenberg1996',
    citation: [
      'Wretenberg P, Feng Y, Arborelius UP (1996). High- and low-bar squatting techniques during weight-training. ',
      { i: 'Med Sci Sports Exerc' },
      ' 28(2):218–224.',
    ],
    links: [
      { label: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/8775157' },
    ],
    usedFor: 'Hip-to-knee ratio target',
  },
  {
    id: 'sanchezmedina2017',
    citation: [
      'Sánchez-Medina L, Pallarés JG, Pérez CE, Morán-Navarro R, González-Badillo JJ (2017). Estimation of relative load from bar velocity in the full back squat exercise. ',
      { i: 'Sports Med Int Open' },
      ' 1:E80–E88.',
    ],
    links: [
      {
        label: 'PDF',
        url: 'https://www.thieme-connect.de/products/ejournals/pdf/10.1055/s-0043-102933.pdf',
      },
    ],
    usedFor:
      'Reference rep speed (0.61 m/s ≈ 80–85%), importer %1RM estimate, grey reference line',
  },
  {
    id: 'isbs2014',
    citation: [
      'A kinematic analysis of the sticking region in full back squats (2014). ',
      { i: 'ISBS Conference Proceedings Archive' },
      '.',
    ],
    links: [
      {
        label: 'Article',
        url: 'https://ojs.ub.uni-konstanz.de/cpa/article/view/6649',
      },
    ],
    usedFor: 'Sticking band (8–22 cm), guide text',
  },
  {
    id: 'kinsi2015',
    citation: [
      'Kinematics and muscle activation around the sticking region in free-weight barbell back squats (2015). ',
      { i: 'Kinesiologia Slovenica' },
      ' 21(1):15–25.',
    ],
    links: [{ label: 'Record', url: 'https://www.sponet.de/Record/4037610' }],
    usedFor: 'Guide text; drive activation held through the region',
  },
  {
    id: 'glassbrook',
    citation: [
      'Glassbrook DJ (2019). The high-bar and low-bar back squat: a biomechanical analysis. AUT thesis. Glassbrook DJ, Helms ER, Brown SR, Storey AG (2017). A review of the biomechanical differences between the high-bar and low-bar back-squat. ',
      { i: 'J Strength Cond Res' },
      ' 31(9):2618–2634.',
    ],
    links: [
      {
        label: 'Repository',
        url: 'https://openrepository.aut.ac.nz/items/dfd50d9d-184a-470b-a677-0039c63c55bd',
      },
      { label: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/28570490/' },
    ],
    usedFor:
      'Knee bracket on the angles graph, ankle check; bar-over-midfoot context',
  },
  {
    id: 'myer2014',
    citation: [
      'Myer GD, Kushner AM, Brent JL, et al. (2014). The back squat: a proposed assessment of functional deficits and technical factors that limit performance. ',
      { i: 'Strength Cond J' },
      ' 36(6):4–27.',
    ],
    links: [
      { label: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov/25506270/' },
    ],
    usedFor: 'Form check items, guide',
  },
  {
    id: 'mckean2010',
    citation: [
      'McKean MR, Dunn PK, Burkett BJ (2010). The lumbar and sacrum movement pattern during the back squat exercise. ',
      { i: 'J Strength Cond Res' },
      ' 24(10):2731–2741.',
    ],
    links: [
      {
        label: 'Record',
        url: 'https://research.usc.edu.au/esploro/outputs/journalArticle/The-Lumbar-and-Sacrum-Movement-Pattern/99449802702621',
      },
    ],
    usedFor: 'Lower-back check (13–26°)',
  },
  {
    id: 'orantes2023',
    citation: [
      'Orantes-Gonzalez E, Heredia-Jimenez J, Lindley SB, Richards J, Chapman G (2023). Motor unit behaviour during the concentric and eccentric phases of a squat task performed at different speeds. ',
      { i: 'Sports Biomechanics' },
      '.',
    ],
    links: [
      {
        label: 'Record',
        url: 'https://knowledge.lancashire.ac.uk/id/eprint/47042/',
      },
    ],
    usedFor: 'Phase activation rationale',
  },
  {
    id: 'enoka1996',
    citation: [
      'Enoka RM (1996). Eccentric contractions require unique activation strategies by the nervous system. ',
      { i: 'J Appl Physiol' },
      ' 81(6):2339–2346.',
    ],
    links: [],
    usedFor: 'Mode factor 0.62',
  },
  {
    id: 'deleva1996',
    citation: [
      'de Leva P (1996). Adjustments to Zatsiorsky-Seluyanov’s segment inertia parameters. ',
      { i: 'J Biomech' },
      ' 29(9):1223–1230.',
    ],
    links: [],
    usedFor: 'Kinetics',
  },
  {
    id: 'wu2005',
    citation: [
      'Wu G, et al. (2005). ISB recommendation on definitions of joint coordinate systems of various joints, part II: shoulder, elbow, wrist and hand. ',
      { i: 'J Biomech' },
      ' 38(5):981–992.',
    ],
    links: [],
    usedFor: 'Shoulder angles',
  },
  {
    id: 'opensim',
    citation: [
      'Rajagopal A, et al. (2016), Lai AKM, et al. (2017) and Uhlrich SD, et al. (2022) musculoskeletal models via opensim-models. Uhlrich SD, et al. (2023). OpenCap: human movement dynamics from smartphone videos. ',
      { i: 'PLOS Comput Biol' },
      '.',
    ],
    links: [
      {
        label: 'SimTK project and data',
        url: 'https://simtk.org/projects/opencap',
      },
    ],
    usedFor: 'Muscle paths; measured-rep format',
  },
  {
    id: 'emg',
    citation: [
      'EMG calibration: Contreras et al. 2015, Caterisano et al. 2002, Hammond et al. 2016, van den Tillaar et al. 2019.',
    ],
    links: [],
    usedFor: 'Activation formulas',
  },
  {
    id: 'scherpereel2023',
    citation: [
      'Scherpereel K, et al. (2023). A human lower-limb biomechanics and wearable sensors dataset during cyclic and non-cyclic activities. ',
      { i: 'Sci Data' },
      ' 10:924.',
    ],
    links: [
      {
        label: 'Article',
        url: 'https://doi.org/10.1038/s41597-023-02840-6',
      },
    ],
    usedFor: 'Open data that could replace modelled curves',
  },
  {
    id: 'bodyparts3d',
    citation: [
      'Anatomy: BodyParts3D © The Database Center for Life Science, licensed CC BY-SA 2.1 JP. This page’s derived geometry is shared under the same terms.',
    ],
    links: [{ label: 'BodyParts3D', url: 'https://lifesciencedb.jp/bp3d/' }],
    usedFor: 'All anatomical geometry',
  },
];
