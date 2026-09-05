import { MeshLambertMaterial } from 'three';

/** The shared opaque material. Vertex colours carry every colour in the world (ART-DIRECTION §2). */
export const opaque = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
