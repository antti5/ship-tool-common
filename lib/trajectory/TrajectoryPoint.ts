import Vector3 from './Vector3.js';

const BALLISTIC_FLATTENING_ENABLED = true;
const BALLISTIC_FLATTENING = 1.0;

class TrajectoryPoint {

   pos: Vector3;
   vel: Vector3;
   time: number;

   constructor(pos: Vector3, vel: Vector3, time: number, flatten = false) {
      this.pos = Vector3.copy(pos);
      this.vel = Vector3.copy(vel);
      this.time = time;

      if (flatten)
         if (BALLISTIC_FLATTENING_ENABLED && this.pos.y > 0)
            this.pos.y = Math.log(BALLISTIC_FLATTENING * this.pos.y + 1.0) / BALLISTIC_FLATTENING;
   }
}

export default TrajectoryPoint;