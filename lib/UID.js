class UID {

   /* Return an UID with the following properties:

   1) Length is fixed at 10 characters.
   2) Used characters are 0-9, a-z and A-Z.
   3) Characters at both ends of the UID change more often.
   4) Uniqueness in the same process is guaranteed for 25 years.
   5) If UIDs are created in two different processes within a one-second time
      window, the probability of a collision is less than one in billion. */

   static #uidOldTimestamp = null;
   static #uidCounter = null;

   static create() {

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
      if (timestamp !== UID.#uidOldTimestamp)
         UID.#uidCounter = Math.floor(Math.random() * counterMax);
      else
         UID.#uidCounter = (UID.#uidCounter + 1) % counterMax;
      UID.#uidOldTimestamp = timestamp;

      /* Counter value is first in the UID because it's more random, thus providing more random
      characters at the start of the UID. Counter value is reversed so that the first character
      changes when several UIDs are created with the same timestamp value. */

      let uid = '';
      ntoaBase(UID.#uidCounter).padStart(COUNTER_DIGITS, '0').split('').reverse().forEach(c => uid += c);
      uid += ntoaBase(timestamp).padStart(TIMESTAMP_DIGITS, '0');
      return uid;
   }
}

export default UID;