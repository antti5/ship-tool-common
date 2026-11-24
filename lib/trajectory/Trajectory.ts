import Vector3 from './Vector3.ts';
import BulletSim from './BulletSim.ts';
import TrajectoryPoint from './TrajectoryPoint.ts';

class Trajectory {

   #elevation: number;
   #points: TrajectoryPoint[];

   constructor(
      projectile: {
         bulletMass: number,
         bulletDiametr: number,
         bulletAirDrag: number,
         bulletSpeed: number // Initial velocity
      },
      elevation: number,
      { flatten = false } = {}
   ) {

      this.#elevation = elevation;

      const pos = new Vector3(0.0, 10.0, 0.0);
      const dir = new Vector3(1.0, Math.tan(elevation), 0.0);
      const vel = new Vector3(
         Math.cos(elevation) * projectile.bulletSpeed,
         Math.sin(elevation) * projectile.bulletSpeed,
         0.0
      );

      this.#points = [
         new TrajectoryPoint(pos, vel, 0, flatten)
      ];

      const bullet = new BulletSim(
         projectile.bulletMass,
         projectile.bulletDiametr,
         projectile.bulletAirDrag,
         projectile.bulletSpeed,
         pos,
         dir
      );

      while (bullet.pos.y > 0) {
         bullet.step();
         this.#points.push(new TrajectoryPoint(pos, bullet.vel, bullet.time, flatten));
      }
   }

   getPoints() {
      return this.#points;
   }

   getParameters() {
      const lastPoint = this.getPoints().at(-1);

      if (!lastPoint)
         throw Error('Unable to get last trajectory point');

      return {
         elevation: this.#elevation,
         range: lastPoint.pos.x,
         flightTime: lastPoint.time / 2.75,
         impactAngle: Math.abs(Math.atan(lastPoint.vel.y / lastPoint.vel.x)),
         impactVelocity: lastPoint.vel.len()
      };
   }
}

export default Trajectory;