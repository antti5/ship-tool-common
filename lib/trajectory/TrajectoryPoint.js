import Vector3 from './Vector3.js';


const BALLISTIC_FLATTENING = 1.0;

class TrajectoryPoint {
   constructor(pos, vel, time, flatten = false) {
      this.pos = Vector3.copy(pos);
      this.vel = Vector3.copy(vel);
      this.time = time;

      if (flatten)
         if (BALLISTIC_FLATTENING !== 0.0 && this.pos.y > 0)
            this.pos.y = Math.log(BALLISTIC_FLATTENING * this.pos.y + 1.0) / BALLISTIC_FLATTENING;
   }
}

export default TrajectoryPoint;