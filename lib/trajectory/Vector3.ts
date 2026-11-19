class Vector3 {

   x: number;
   y: number;
   z: number;

   constructor(x = 0.0, y = 0.0, z = 0.0) {
      this.x = x;
      this.y = y;
      this.z = z;
   }

   static copy(other: Vector3) {
      return new Vector3(
         other.x,
         other.y,
         other.z
      );
   }

   iadd(other: Vector3) {
      this.x += other.x;
      this.y += other.y;
      this.z += other.z;
   }

   add(other: Vector3) {
      return new Vector3(
         this.x + other.x,
         this.y + other.y,
         this.z + other.z
      );
   }

   isub(other: Vector3) {
      this.x -= other.x;
      this.y -= other.y;
      this.z -= other.z;
   }

   sub(other: Vector3) {
      return new Vector3(
         this.x - other.x,
         this.y - other.y,
         this.z - other.z
      );
   }

   imul(other: Vector3 | number) {
      if (other instanceof Vector3) {
         this.x *= other.x;
         this.y *= other.y;
         this.z *= other.z;
      } else {
         this.x *= other;
         this.y *= other;
         this.z *= other;
      }
   }

   mul(other: Vector3 | number) {
      if (other instanceof Vector3)
         return new Vector3(
            this.x * other.x,
            this.y * other.y,
            this.z * other.z
         );
      else
         return new Vector3(
            this.x * other,
            this.y * other,
            this.z * other
         );
   }

   idiv(other: Vector3 | number) {
      if (other instanceof Vector3) {
         this.x /= other.x;
         this.y /= other.y;
         this.z /= other.z;
      } else {
         this.x /= other;
         this.y /= other;
         this.z /= other;
      }
   }

   div(other: Vector3 | number) {
      if (other instanceof Vector3)
         return new Vector3(
            this.x / other.x,
            this.y / other.y,
            this.z / other.z
         );
      else
         return new Vector3(
            this.x / other,
            this.y / other,
            this.z / other
         );
   }

   dot(other: Vector3) {
      return this.x * other.x + this.y * other.y + this.z * other.z;
   }

   sqnorm() {
      return this.dot(this);
   }

   len() {
      return Math.sqrt(this.sqnorm());
   }

   normalize() {
      const n = this.len();
      this.x /= n;
      this.y /= n;
      this.z /= n;
   }

   normalized() {
      return this.div(this.len());
   }
}

export default Vector3;