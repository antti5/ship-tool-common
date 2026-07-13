class Util {

   /* Sleep the given number of milliseconds.

   The executor function given to the Promise constructor simply sets a timeout to call
   the resolve function. The Promise is never rejected. */

   static async sleep(ms) {
      await new Promise(res => setTimeout(res, ms));
   }


   /* Wrapper for Window.fetch(). On success the response body is returned as a JavaScript
   object, or as Javascript string if the response headers don't indicate the body to be JSON.

   If the environment variable VITE_FETCH_CACHE_MS is set, then fetch responses for each URL
   are cached for the given number of milliseconds.

   If the option "urlSearchParams" is received, it is expected to be an object containing
   name-value pairs, and is turned into a URLSearchParams object.

   If Window.fetch() throws an exception, e.g. on badly formatted request or network error,
   then this exception is NOT caught.

   If Window.fetch() returns a response with other than 2** status code, then an exception
   is thrown. The error message contains the HTTP status text and code, and the "cause" property
   contains the Window.fetch() response object. */

   static #fetchResponse = {};

   static async fetch (url, {
      urlSearchParams,
      method = 'GET',
      body,
      headers = {},
      timeout,
      debug
   } = {}) {

      if (urlSearchParams)
         url += '?' + new URLSearchParams(urlSearchParams);

      const cacheMs = Number(
         typeof process !== 'undefined' ?
            process.env?.VITE_FETCH_CACHE_MS :    // Vitest
            import.meta?.env?.VITE_FETCH_CACHE_MS // Development and production
      );

      if (cacheMs && Util.#fetchResponse[url]?.timestamp + cacheMs > Date.now()) {
         console.debug('Returning cached response for URL', url);
         return Util.#fetchResponse[url].body;
      }

      if (debug)
         console.debug('fetch()', method, url);

      const requestHeaders = { ...headers };
      if (body)
         requestHeaders['Content-Type'] = 'application/json';
      const response = await fetch(url, {
         method,
         body: body ?
            JSON.stringify(body) :
            undefined,
         headers: requestHeaders,
         signal: timeout ?
            AbortSignal.timeout(timeout) :
            undefined
      });

      if (debug)
         console.debug('fetch() response:', response);

      if (!response.ok)
         throw new Error(`${response.statusText} (${response.status})`, { cause: response });

      const responseBody =
         response.headers.get('Content-Type')?.includes('application/json') ?
            await response.json() :
            await response.text(); // If response isn't JSON, return a String instead -- TODO: This may be very poor design

      if (debug)
         console.debug('fetch() response body:', responseBody);

      if (cacheMs) {
         console.debug('Caching response for URL', url);
         Util.#fetchResponse[url] = {
            timestamp: Date.now(),
            body: responseBody
         };
      }

      return responseBody;
   }

   static #getEnvironment() {
      return typeof process !== 'undefined' ?
         process.env.NODE_ENV.trim() :
         import.meta.env.MODE.trim();
   }

   static #isProduction() {
      return window.location.host.endsWith('shiptool.st');
   }

   static envDevelopment() {
      return Util.#getEnvironment() === 'development';
   }

   static envTest() {
      return Util.#getEnvironment() === 'test';
   }

   static envDeployed() {
      return Util.#getEnvironment() === 'production';
   }

   static envDeployedProduction() {
      return Util.envDeployed() && Util.#isProduction();
   }

   static envDeployedTest() {
      return Util.envDeployed() && !Util.#isProduction();
   }

   static envExperimental() {
      return !Util.envDeployedProduction() && !window.ST_NO_EXPERIMENTAL;
   }


   /* Generated random numbers and index for the next number. */

   static #randoms = [];
   static #randomsIndex = 0;

   /* Get a random number, either from the #randoms array or create and store a new one. */

   static random() {
      if (Util.#randomsIndex === Util.#randoms.length)
         Util.#randoms.push(Math.random());
      return Util.#randoms[Util.#randomsIndex++];
   }

   /* Switch back to the start of randoms array to return the same random numbers again. */

   static randomReset() {
      Util.#randomsIndex = 0;
   }


   /* Return an UID with the following properties:

   1) Length is fixed at 10 characters.
   2) Used characters are 0-9, a-z and A-Z.
   3) Characters at both ends of the UID change more often.
   4) Uniqueness in the same process is guaranteed for 25 years.
   5) If UIDs are created in two different processes within a one-second time
      window, the probability of a collision is less than one in billion. */

   static #uidOldTimestamp = null;
   static #uidCounter = null;

   static uid() {

      const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const BASE = DIGITS.length;
      const TIMESTAMP_DIGITS = 7;
      const TIMESTAMP_WRAPAROUND_YEARS = 25;
      const COUNTER_DIGITS = 3;

      /* Return a positive integer in a different base. */

      const ntoaBase = n => {
         let result = '';
         while (n >= BASE) {
            result = DIGITS[n % BASE] + result;
            n = Math.floor(n / BASE);
         };
         return DIGITS[n % BASE] + result;
      };

      /* Create a timestamp value that as a 7-digit base-62 number wraps around every 25 years.
      Timestamp value changes every 0.224 milliseconds. */

      const timestampMax = BASE ** TIMESTAMP_DIGITS;
      const msPerTimestamp =
         1 / (timestampMax / TIMESTAMP_WRAPAROUND_YEARS / 365 / 24 / 60 / 60 / 1000);
      const timestamp = Math.abs(Math.floor(Date.now() / msPerTimestamp) % timestampMax);

      /* Create a counter value represented as a 3-digit base-62 number. If the timestamp is
      different from previous call the counter value is reset to a random value to avoid using
      the same counter value in different processes.

      If the timestamp has not changed, however, the counter is incremented by one to guarantee
      62 ** 3 = 238328 different UIDs with the same timestamp value. */

      const counterMax = BASE ** COUNTER_DIGITS;
      if (timestamp !== Util.#uidOldTimestamp)
         Util.#uidCounter = Math.floor(Math.random() * counterMax);
      else
         Util.#uidCounter = (Util.#uidCounter + 1) % counterMax;
      Util.#uidOldTimestamp = timestamp;

      /* Counter value is first in the UID because it's more random, thus providing more random
      characters at the start of the UID. Counter value is reversed so that the first character
      changes when several UIDs are created with the same timestamp value. */

      let uid = '';
      ntoaBase(Util.#uidCounter).padStart(COUNTER_DIGITS, '0').split('').reverse().forEach(c => uid += c);
      uid += ntoaBase(timestamp).padStart(TIMESTAMP_DIGITS, '0');
      return uid;
   }


   static perfObject(key) {
      window.ST_PERF ??= {};
      window.ST_PERF[key] ??= [];
      return window.ST_PERF[key];
   }

   static perfStart() {
      return performance.now();
   }

   static perfEndMany(count, startTime, key, { log } = {}) {
      const ms = performance.now() - startTime;
      const o = Util.perfObject(key);

      for (let i = 0; i < count; i++)
         o.push(ms / count);

      if (log) {
         console.debug('Performance:', `${count}x`, key, Util.round(ms / count, 2), 'ms');
         if (count > 1)
            console.debug('Performance: Total:', Util.round(ms, 2), 'ms');
      }
   }

   static perfEnd(...args) {
      return Util.perfEndMany(1, ...args);
   }

   static perfReport() {
      const result = {};
      for (const [key, values] of Object.entries(window.ST_PERF ?? {}))
         result[key] = {
            count: values.length,
            total: values.reduce((sum, ms) => sum + ms).toFixed(2) + ' ms',
            avg: (values.reduce((sum, ms) => sum + ms) / values.length).toFixed(2) + ' ms',
            min: Math.min(...values).toFixed(2) + ' ms',
            max: Math.max(...values).toFixed(2) + ' ms'
         };
      return result;
   }


   /* Returns s converted to an integer, but only if it falls into the acceptable range */

   static parseIntRange(s, min, max) {
      if (isNaN(+s))
         return null;
      const n = Math.round(+s);
      if (n < min || n > max)
         return null;
      return n;
   }


   /* Round the number to given number of decimals. */

   static round(number, decimals = 0) {
      const multiplier = Math.pow(10, decimals);
      return Math.round(number * multiplier) / multiplier;
   }


   /* Round the fractional part of a number so that the number has at least the given
   number of significant digits.

   The integer part is not rounded, however. So (123.45, 4) --> 123.5, but (12345, 4) --> 12345. */

   static roundPrecision(number, significantDigits) {
      return Util.round(
         number,
         Number(number) === 0 ?
            significantDigits :
            Math.max(0, significantDigits - Math.floor(Math.log10(number) + 1))
      );
   }


   /* Return the given number value in string format in the given locale, or the string "NaN"
   if the value cannot be converted to number.

   Thousand separators are used, with the minimum value given as an optional parameter.

   If the optional parameter "signed" is set to true, positive values will also be signed.
   Positive and negative zero never has a sign, however.

   Negative values are always returned with the minus sign as the character. Note that this
   alone will prevent the return value to be used as a number.

   By default the number of is rounded to zero decimals. If the option "decimals" is a number
   then a fixed number of decimals are used, including possible trailing zeros. The option
   "decimals" can also be a two-element array that gives the minimum and maximum number of
   fraction digits. */

   static formatNumber(value, {
      locale = 'en',
      signed = false,
      separatorMin = 1000,
      decimals = 0
   }  = {}) {

      const number = Number(value);

      /* Value cannot be converted to a number -- this is likely an accident? */
      if (Number.isNaN(number)) {
         console.warn('Cannot format number', value);
         return String(NaN);
      }

      const options = {
         /* Add thousand separators if value is big/small enough */
         useGrouping: Math.abs(number) >= separatorMin,
         signDisplay: signed ? 'exceptZero' : 'negative'
      };

      if (decimals instanceof Array) {
         options.minimumFractionDigits = decimals[0];
         options.maximumFractionDigits = decimals[1];
      } else if (typeof decimals === 'number' ) {
         options.minimumFractionDigits = decimals;
         options.maximumFractionDigits = decimals;
      }

      /* Localized to string */
      const localized = number.toLocaleString(locale, options);

      /* Finally, replace possible hyphen-minus with a minus sign */
      return localized[0] === '-' ?
         ('\u2212' + localized.slice(1)) :
         localized;
   }


   /* Format number of seconds to either like "40 or like "1:40". */

   static formatSeconds(seconds) {
      if (seconds <= 60)
         return Math.round(seconds);
      else
         return Math.floor(seconds / 60) + ':' + (Math.round(seconds) % 60).toString().padStart(2, '0');
   }


   /* Convert integer to roman numerals.

   https://stackoverflow.com/a/56444611 */

   static toRoman(int) {
      let roman = '';
      roman += 'M'.repeat(int / 1000); int %= 1000;
      roman += 'CM'.repeat(int / 900); int %= 900;
      roman += 'D'.repeat(int / 500); int %= 500;
      roman += 'CD'.repeat(int / 400); int %= 400;
      roman += 'C'.repeat(int / 100); int %= 100;
      roman += 'XC'.repeat(int / 90); int %= 90;
      roman += 'L'.repeat(int / 50); int %= 50;
      roman += 'XL'.repeat(int / 40); int %= 40;
      roman += 'X'.repeat(int / 10); int %= 10;
      roman += 'IX'.repeat(int / 9); int %= 9;
      roman += 'V'.repeat(int / 5); int %= 5;
      roman += 'IV'.repeat(int / 4); int %= 4;
      roman += 'I'.repeat(int);
      return roman;
   }


   /* Like the Bash built-in command: Return an array of integers from start to end.

   Note: Step can be negative, or non-integer. */

   static seq(start, end, step = 1) {
      const result = [];
      for (let value = start; step > 0 ? value <= end : value >= end; value += step)
         result.push(value);
      return result;
   }


   /* Return an array of [ minValue, maxValue ] for the given array.

   If the array has only one value, then return the array is returned. */

   static minMax(array) {
      if (array.length > 1)
         return [Math.min(...array), Math.max(...array)];
      else
         return array;
   }


   /* Write log messages with a time in milliseconds elapsed since window.ST_TIMELINE_START that should be stored
   at the earliest possible moment in the first <script> element of <head>. */

   static logTimeline(message, { devel = false } = {}) {

      /* If window.ST_TIMELINE_START is not set, set it on first call */

      if (!window.ST_TIMELINE_START) {
         console.info('Initializing window.ST_TIMELINE_START as it is not set');
         window.ST_TIMELINE_START = Date.now();
      }

      if (devel && !Util.envDevelopment)
         return;

      console.info(
         `%c<< ${Date.now() - +window.ST_TIMELINE_START} ms >> ${message}`,
         `font-weight: ${devel ? 'normal' : 'bold'}; font-size: 1.1em;`
      );
   }


   /* Like Python's zip(): Return an array of arrays from a set of iterables. Each item of the
   returned array is an array of values of the iterables.

   For example: ['a', 'b', 'c'], [1, 2] => [['a', 1], ['b', 2], ['c', undefined]] */

   static zip(...args) {
      const iterators = args.map(arg => arg[Symbol.iterator]());
      const result = [];

      let done = false;
      while (!done) {
         const a = [];
         done = true;
         for (const iterator of iterators) {
            const next = iterator.next();
            a.push(next.value);
            if (!next.done)
               done = false;
         }
         if (!done)
            result.push(a);
      }

      return result;
   }


   /* Compare two version numbers. If versions have unequal number of components,
   the one with fewer components is considered earlier, e.g. 1.2 is before 1.2.0.

   By default any number of components are considered in the version number, but
   this can be limited by providing the third parameter maxComponents. */

   static versionCompare(
      version1,
      version2,
      {
         maxComponents = Number.MAX_VALUE,
         skipLeadingZeros = false
      } = {}
   ) {

      let
         components1 = version1.split('.'),
         components2 = version2.split('.');

      if (skipLeadingZeros) {
         components1 = components1.slice(components1.findIndex(n => n !== '0'));
         components2 = components2.slice(components2.findIndex(n => n !== '0'));
      }

      for (const [num1, num2] of Util.zip(components1, components2).slice(0, maxComponents)) {
         if (!num1)
            return -1;
         if (!num2)
            return 1;
         const diff = +num1 - +num2;
         if (diff)
            return diff;
      }
      return 0;
   }


   /* Calculate a new version number from a version number an offset.

   Positive offset returns an older version, negative offset a newer version. */

   static #versionCalculate(version, offset) {
      const [, major, minor] = version.match(/^[0-9]+\.([0-9]+)\.([0-9]+)/);
      const oldVersion = Number(major) * 12 + Number(minor) - Number(offset);
      return `0.${Math.floor(oldVersion / 12)}.${oldVersion % 12}`;
   }

   static versionEarlier(version, offset) {
      return Util.#versionCalculate(version, offset);
   }

   static versionLater(version, offset) {
      return Util.#versionCalculate(version, -offset);
   }


   /* Adjust an array of numbers so that all numbers have at least the given
   numerical distance. For example ( [1, 2], 2 ) returns [ 0.5, 2.5 ].

   The returned array has the corresponding order of values.

   TODO: Configurable handling for duplicate values? Currently they are also spaced out. */

   static distNumbers(src, dist) {

      /* Shift integer value at the given index by the given amount.

      Once done, check if the next value in the direction of the shift is now
      too close. If it is, recursively shift it either the same amount or to
      the minimum distance, whichever is less. */

      const move = (j, shift) => {
         a[j].n += shift;
         if (shift > 0 && j + 1 in a) {
            const spread = dist - (a[j + 1].n - a[j].n);
            if (spread > 0)
               move(j + 1, Math.min(spread, shift));
         }
         if (shift < 0 && j - 1 in a) {
            const spread = dist - (a[j].n - a[j - 1].n);
            if (spread > 0)
               move(j - 1, Math.max(-spread, shift));
         }
      };

      /* Sort the array to numerical order, replacing each number with an object
      that also contains its original index. */

      const a = src.map((n, i) => ({ n, i })).sort((n, m) => n.n - m.n);

      /* Scan the array, and if any two numbers are too close, shift their values
      equally away from each other to have the minimum distance. */

      for (let i = 1; i < a.length; i++) {
         const spread = dist - (a[i].n - a[i - 1].n);
         if (spread > 0) {
            move(i, spread / 2);
            move(i - 1, -spread / 2);
         }
      }

      /* Return the adjusted numbers in the original order */

      return a.sort((n, m) => n.i - m.i).map(n => n.n);
   }


   static arrayIntersection(...arrays) {

      /* Recursively intersect two or more arrays */
      const doIntersection = (...arrays) => {
         const set = new Set(arrays[1]);
         const intersection = arrays[0].filter(value => set.has(value));
         if (arrays.length > 2)
            return doIntersection(intersection, ...arrays.slice(2));
         else
            return intersection;
      };

      if (arrays.length === 0)
         return [];
      else if (arrays.length === 1)
         return [...arrays[0]];
      else
         return doIntersection(...arrays);
   }


   static arrayUnion(...arrays) {

      /* Recursively make a union of two or more arrays */
      const doUnion = (...arrays) => {
         const set = new Set(arrays[0]);
         const union = [...arrays[0], ...arrays[1].filter(value => !set.has(value))];
         if (arrays.length > 2)
            return doUnion(union, ...arrays.slice(2));
         else
            return union;
      };

      if (arrays.length === 0)
         return [];
      else if (arrays.length === 1)
         return [...arrays[0]];
      else
         return doUnion(...arrays);
   }


   static arrayDifference(...arrays) {

      /* Recursively make a difference of two or more arrays */
      const doDifference = (...arrays) => {
         const set = new Set(arrays[1]);
         const difference = arrays[0].filter(value => !set.has(value));
         if (arrays.length > 2)
            return doDifference(difference, ...arrays.slice(2));
         else
            return difference;
      };

      if (arrays.length === 0)
         return [];
      else if (arrays.length === 1)
         return [...arrays[0]];
      else
         return doDifference(...arrays);
   }


   /* Compare two arrays, returning an array of three arrays:

   1. Array of values included only in A
   2. Array of values included in both A and B
   3. Array of values included only in B

   The result is the same as [arrayDifference(A, B), arrayIntersection(A, B), arrayDifference(B, A)],
   but this implementation should be a little bit faster because only two arrays are supported.

   Warning: Duplicate values are not handled consistently. Duplicates included only in one of the
   arrays are retained, but if included in both only duplicates of A are retained. */

   static arrayCompare(a, b) {
      const onlyA = [];
      const onlyB = [];
      const both = [];
      const aSet = new Set(a);
      const bSet = new Set(b);
      for (const aValue of a)
         if (bSet.has(aValue))
            both.push(aValue);
         else
            onlyA.push(aValue);
      for (const bValue of b)
         if (!aSet.has(bValue))
            onlyB.push(bValue);
      return [onlyA, both, onlyB];
   }


   /* Split array into chunks of the given size. Last chunk may be shorter. */

   static arrayChunks(a, chunkSize) {
      const result = [];
      for (let i = 0; i < a.length; i += chunkSize)
         result.push(a.slice(i, i + chunkSize));
      return result;
   }


   /* Split array into equal-sized chunks of at most the given size. All chunks
   may be shorter than the maximum size, and last chunk may be shorter than others.

   As an example, if an array of length 9 is split to chunks of maximum length 4,
   three arrays of length 3 are returned. */

   static arrayChunksEqual(a, maxChunkSize) {
      const noChunks = Math.ceil(a.length / maxChunkSize);
      const chunkSize = Math.ceil(a.length / noChunks);
      return Util.arrayChunks(a, chunkSize);
   }


   /* Return the prototype chain of an object as an array of constructor names */

   static getPrototypeChain(o) {
      const result = [];
      let p = Object.getPrototypeOf(o);
      while(p) {
         result.push(p.constructor.name);
         p = Object.getPrototypeOf(p);
      }
      return result;
   }


   /* Linear regression using least squares method.

   Adapted from: https://stackoverflow.com/a/31566791

   Currently only slope is used so the rest have been commented. */

   static linearRegression(y, x) {
      const n = y.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      // let sumYY = 0;

      for (let i = 0; i < n; i++) {
         sumX += x[i];
         sumY += y[i];
         sumXY += x[i] * y[i];
         sumXX += x[i] ** 2;
         // sumYY += y[i] ** 2;
      }

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX ** 2);
      // const intercept = (sumY - slope * sumX) / n;
      // const r2 = ((n * sumXY - sumX * sumY) / Math.sqrt((n * sumXX - sumX ** 2) * (n * sumYY - sumY ** 2))) ** 2;

      return {
         slope,
         // intercept,
         // r2
      };
   }


   static camelToUpperCase(s) {
      return s.replaceAll(/[A-Z]/g, (match, offset) => (offset > 0 ? '_' : '') + match).toUpperCase();
   }

   static camelToLowerCase(s) {
      return s.replaceAll(/[A-Z]/g, (match, offset) => (offset > 0 ? '_' : '') + match).toLowerCase();
   }


   static #tableColumns;
   static #tableLogger;
   static #tableRule;

   static tableStart(columns, { logger = null } = {}) {
      Util.#tableColumns = columns.map(({ name, width, right }) => ({
         width: width || name.length,
         right
      }));
      Util.#tableLogger = logger || console.log;
      Util.#tableRule = '-'.repeat(columns.reduce((sum, { width }) => sum + width, 0) + columns.length - 1);
      Util.#tableLogger(Util.#tableRule);
      Util.tableRow(...columns.map(({ name }) => name));
      Util.#tableLogger(Util.#tableRule);
   }

   static tableRow(...values) {
      Util.#tableLogger(values.map((value, i) =>
         Util.#tableColumns[i].right ?
            String(value).padEnd(Util.#tableColumns[i].width) :
            String(value).padStart(Util.#tableColumns[i].width)
      ).join(' '));
   }

   static tableEnd() {
      Util.#tableLogger(Util.#tableRule);
   }


   /* Asynchronous intervals, adapted from: https://dev.to/jsmccrumb/asynchronous-setinterval-4j69 */

   static #asyncIntervals = [];

   static async #runAsyncInterval(callback, interval, intervalIndex) {
      await callback();
      if (Util.#asyncIntervals[intervalIndex])
         setTimeout(() => Util.#runAsyncInterval(callback, interval, intervalIndex), interval);
   }

   static setAsyncInterval(callback, interval) {
      if (typeof callback === 'function') {
         const intervalIndex = Util.#asyncIntervals.length;
         Util.#asyncIntervals.push(true);
         Util.#runAsyncInterval(callback, interval, intervalIndex);
         return intervalIndex;
      } else {
         throw new Error('Callback must be a function');
      }
   }

   static clearAsyncInterval(intervalIndex) {
      if (Util.#asyncIntervals[intervalIndex])
         Util.#asyncIntervals[intervalIndex] = false;
   }
}


export default Util;