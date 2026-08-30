class Vector3 {
   constructor(x = 0.0, y = 0.0, z = 0.0) {
      this.x = x;
      this.y = y;
      this.z = z;
   }

   static copy(other) {
      return new Vector3(
         other.x,
         other.y,
         other.z
      );
   }

   iadd(other) {
      this.x += other.x;
      this.y += other.y;
      this.z += other.z;
   }

   add(other) {
      return new Vector3(
         this.x + other.x,
         this.y + other.y,
         this.z + other.z
      );
   }

   isub(other) {
      this.x -= other.x;
      this.y -= other.y;
      this.z -= other.z;
   }

   sub(other) {
      return new Vector3(
         this.x - other.x,
         this.y - other.y,
         this.z - other.z
      );
   }

   imul(other) {
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

   mul(other) {
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

   idiv(other) {
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

   div(other) {
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

   dot(other) {
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