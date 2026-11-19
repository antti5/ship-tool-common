interface Waiter {
   resolve: (value?: unknown) => void,
   reject: (reason: unknown) => void
}

interface QueueItem extends Waiter {
   jobClass?: string,
}


class Semaphore {

   #value = 0;
   #max;
   #queue: QueueItem[] = [];

   #rateLimit: number = 0;
   #rateLimitInterval: number | null = null;

   #waiters: Waiter[] = [];


   constructor(max = 1, { rateLimit = 0 }: { rateLimit?: number } = {}) {
      this.#max = max;
      this.#rateLimit = rateLimit;
   }

   acquire({ jobClass }: { jobClass?: string } = {}) {

      /* If the semaphore is not at maximum value and no rate limit interval
      has been set, return immediately.

      If the semaphore is rate-limited, then set interval so that the next
      acquisition will be timed. */

      if (this.#value < this.#max && !this.#rateLimitInterval) {
         if (this.#rateLimit > 0)
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

            /* Note: Here non-null assertion is required because, regardless of the length check,
            TypeScript believes that pop() may return undefined. */

            this.#waiters.pop()!.resolve();

      if (!this.#rateLimit)
         this.#resolveNext();
   }

   #resolveNext() {
      if (this.#queue.length > 0 && this.#value < this.#max) {
         this.#value++;
         this.#queue.shift()!.resolve();
      }

      if (this.#queue.length === 0 && this.#rateLimitInterval) {
         clearInterval(this.#rateLimitInterval);
         this.#rateLimitInterval = null;
      }
   }

   purge() {
      while (this.#queue.length > 0)
         this.#queue.pop()!.reject('Semaphore was purged');

      while (this.#waiters.length > 0)
         this.#waiters.pop()!.reject('Semaphore was purged');

      this.#queue = [];
      this.#value = 0;
   }

   raiseJobClass(jobClass: string) {
      this.#queue = [
         ...this.#queue.filter(job => job.jobClass === jobClass),
         ...this.#queue.filter(job => job?.jobClass !== jobClass)
      ];
   }

   lowerJobClass(jobClass: string) {
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

   setMax(max: number) {
      this.#max = max;
   }

   getRateLimit() {
      return this.#rateLimit;
   }

   setRateLimit(rateLimit: number) {
      this.#rateLimit = rateLimit;
   }

   async run(
      func: () => Promise<void>,
      { jobClass }: { jobClass?: string } = {}
   ) {
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
      return;
   }
}

export default Semaphore;