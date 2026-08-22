class Semaphore {

   #value = 0;
   #max;
   #queue = [];

   #rateLimit;
   #rateLimitInterval;

   #waiters = [];

   constructor(max = 1, { rateLimit = null } = {}) {
      this.#max = max;
      this.#rateLimit = rateLimit;
   }

   acquire({ jobClass = null } = {}) {

      /* If the semaphore is not at maximum value and no rate limit interval
      has been set, return immediately.

      If the semaphore is rate-limited, then set interval so that the next
      acquisition will be timed. */

      if (this.#value < this.#max && !this.#rateLimitInterval) {
         if (this.#rateLimit)
            this.#rateLimitInterval = setInterval(
               () => this.#resolveNext(),
               1000 / this.#rateLimit
            );
         this.#value++;
         return;
      }

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

      if (this.#queue.length === 0 && this.#rateLimitInterval) {
         clearInterval(this.#rateLimitInterval);
         this.#rateLimitInterval = null;
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
         ...this.#queue.filter(job => job?.jobClass !== jobClass)
      ];
   }

   lowerJobClass(jobClass) {
      this.#queue = [
         ...this.#queue.filter(job => job?.jobClass !== jobClass),
         ...this.#queue.filter(job => job.jobClass === jobClass)
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

   getRateLimit() {
      return this.#rateLimit;
   }

   setRateLimit(rateLimit) {
      this.#rateLimit = rateLimit;
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