class Semaphore {

   #value = 0;
   #max;
   #queue = [];

   #rateLimit;
   #resolveInterval;

   #waiters = [];

   constructor(max = 1, { rateLimit = null } = {}) {
      this.#max = max;
      this.#rateLimit = rateLimit;
   }

   acquire({ jobClass = null } = {}) {
      if (this.#value < this.#max && !this.#rateLimit) {
         this.#value++;
         return new Promise(resolve => resolve());
      }

      if (this.#rateLimit && !this.#resolveInterval)
         this.#resolveInterval = setInterval(() => this.#resolveNext(), 1000 / this.#rateLimit);

      return new Promise((resolve, reject) =>
         this.#queue.push({ jobClass, resolve, reject })
      );
   }

   release() {
      this.#value--;

      if (this.#value === 0 && this.#queue.length === 0)
         while (this.#waiters.length > 0)
            this.#waiters.pop().resolve();

      if (!this.#rateLimit)
         this.#resolveNext();
   }

   #resolveNext() {
      if (this.#queue.length > 0 && this.#value < this.#max) {
         this.#value++;
         this.#queue.shift().resolve();
      }

      if (this.#queue.length === 0 && this.#resolveInterval) {
         clearInterval(this.#resolveInterval);
         this.#resolveInterval = null;
      }
   }

   purge() {
      while (this.#queue.length > 0)
         this.#queue.pop().reject('Semaphore was purged');

      while (this.#waiters.length > 0)
         this.#waiters.pop().reject('Semaphore was purged');

      this.#queue = [];
      this.#value = 0;
   }

   raiseJobClass(jobClass) {
      this.#queue = [
         ...this.#queue.filter(job => job.jobClass === jobClass),
         ...this.#queue.filter(job => !job.jobClass || job.jobClass !== jobClass)
      ];
   }

   getQueueLength() {
      return this.#queue.length;
   }

   getMax() {
      return this.#max;
   }

   setMax(max) {
      this.#max = max;
   }

   async run(func, { jobClass = null } = {}) {
      try {
         await this.acquire({ jobClass });
         return await func();
      } finally {
         this.release();
      }
   }

   async wait() {
      if (this.#value > 0 || this.#queue.length > 0)
         return new Promise((resolve, reject) => {
            this.#waiters.push({ resolve, reject });
         });
   }
}

export default Semaphore;