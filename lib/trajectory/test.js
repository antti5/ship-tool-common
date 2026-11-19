import Vector3 from './Vector3.ts';
import BulletSim from './BulletSim.ts';

const pos = new Vector3(0, 0, 0);
const dir = new Vector3(1, 1, 1);
const sim = new BulletSim(1, 1, 1, 1, pos, dir);
sim.step();
sim.step();
sim.step();