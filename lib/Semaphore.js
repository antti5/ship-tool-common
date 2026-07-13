class Semaphore {

   static TPS_MAX = 10_000;

   #value = 0;
   #max;
   #queue = [];

   #waiter = {};
   #waiterQueue = {};

   #measureTps;
   #timestamps = [];

   constructor(max = 1, { measureTps = false } = {}) {
      this.#max = max;
      this.#measureTps = measureTps;
   }

   acquire({ jobClass = null } = {}) {
      if (this.#value < this.#max) {
         this.#value++;
         return new Promise(resolve => resolve());
      } else
         return new Promise((resolve, reject) =>
            this.#queue.push({ jobClass, resolve, reject })
         );
   }

   release() {
      this.#value--;

      if (this.#measureTps) {
         this.#timestamps.push(Date.now());
         if (this.#timestamps.length > Semaphore.TPS_MAX)
            this.#timestamps.shift();
      }

      if (this.#queue.length > 0 && this.#value < this.#max) {
         this.#value++;
         this.#queue.shift().resolve();

         if (this.#waiterQueue[this.#queue.length]?.length > 0)
            for (const { resolve } of this.#waiterQueue[this.#queue.length])
               resolve();
      }

      else if (this.#waiter[this.#value]?.length > 0)
         for (const { resolve } of this.#waiter[this.#value])
            resolve();
   }

   purge() {
      for (const { reject } of this.#queue)
         reject('Semaphore was purged');

      for (const { reject } of [...Object.values(this.#waiter), ...Object.values(this.#waiterQueue)].flat())
         reject('Semaphore was purged');

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

   getTps(count = Semaphore.TPS_MAX) {
      const slice = this.#timestamps.slice(-count);
      return slice.length > 1 ?
         (slice.length - 1) / (slice.at(-1) - slice.at(0)) * 1000 :
         0;
   }

   getMax() {
      return this.#max;
   }

   setMax(max) {
      this.#max = max;
   }

   async wait(value = 0) {
      if (this.#value > value) {
         return new Promise((resolve, reject) => {
            this.#waiter[value] ??= [];
            this.#waiter[value].push({ resolve, reject });
         });
      }
   }

   async waitQueue(length = 0) {
      while (this.#queue.length > length)
         return new Promise((resolve, reject) => {
            this.#waiterQueue[length] ??= [];
            this.#waiterQueue[length].push({ resolve, reject });
         });
   }

   async run(func, { jobClass = null } = {}) {
      try {
         await this.acquire({ jobClass });
         return await func();
      }

      finally {
         this.release();
      }
   }
}


export default Semaphore;