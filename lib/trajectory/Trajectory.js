import Vector3 from './Vector3.js';
import BulletSim from './BulletSim.js';
import TrajectoryPoint from './TrajectoryPoint.js';

class Trajectory {

   constructor(
      {
         bulletMass: mass,
         bulletDiametr: diameter,
         bulletAirDrag: dragCoeff,
         bulletSpeed: initialVelocity
      },
      elevation,
      { flatten = false } = {}
   ) {

      this._elevation = elevation;

      const pos = new Vector3(0.0, 10.0, 0.0);
      const dir = new Vector3(1.0, Math.tan(elevation), 0.0);
      const vel = new Vector3(Math.cos(elevation) * initialVelocity, Math.sin(elevation) * initialVelocity, 0.0);

      this.points = [
         new TrajectoryPoint(pos, vel, 0, flatten)
      ];

      const bullet = new BulletSim(mass, diameter, dragCoeff, initialVelocity, pos, dir);
      while (bullet.pos.y > 0) {
         bullet.step();
         this.points.push(new TrajectoryPoint(pos, bullet.vel, bullet.time, flatten));
      }
   }

   getPoints() {
      return this.points;
   }

   getParameters() {
      const lastPoint = this.getPoints().at(-1);
      return {
         elevation: this._elevation,
         range: lastPoint.pos.x,
         flightTime: lastPoint.time / 2.75,
         impactAngle: Math.abs(Math.atan(lastPoint.vel.y / lastPoint.vel.x)),
         impactVelocity: lastPoint.vel.len()
      };
   }
}

export default Trajectory;