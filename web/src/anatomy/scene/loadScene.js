// The one dynamic import of the 3D chunk (three.js plus the scene). Nothing
// else may import createAnatomyScene.js, or three lands in a boot graph; the
// bundle check fails if it reaches either entry.
export const loadSceneModule = () => import('./createAnatomyScene.js');
