import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import dotenv from 'dotenv';
import findConfig from 'find-config';
import Util from './Util.js';


/* Additional utility functions that only work in Node.js */

class UtilNode extends Util {

   static #envFileLoaded: Record<string,boolean> = {};

   /* Return environment variable value. The given .env file is loaded with find-config
   so that it is also loaded from a parent directory.

   If the environment variable cannot be found the process exits with exit value 1. */

   static env(name: string, envFile = '.env') {

      if (envFile in UtilNode.#envFileLoaded === false) {
         const path = findConfig(envFile);
         if (!path) {
            console.warn(`Environment variable file "${envFile}" not found`);
            process.exit(1);
         }

         dotenv.config({
            path,
            quiet: true
         });
         UtilNode.#envFileLoaded[envFile] = true;
      }

      const value = process.env[name];
      if (!value) {
         console.warn(`Environment variable ${name} not defined`);
         process.exit(1);
      }

      return value;
   }


   /* Return a list of filenames under the given directory, recursively including
   subdirectories. Optionally, the array to which the filenames are added can be
   given as the second argument. */

   static walkSync(dir: string, target: string[] = []) {
      for (const file of fs.readdirSync(dir)) {
         target = fs.statSync(path.join(dir, file)).isDirectory() ?
            UtilNode.walkSync(path.join(dir, file), target) :
            target.concat(path.join(dir, file));
      }
      return target;
   }


   /* Read JSON file and return it as an Object.

   If the filename ends with ".gz" or ".br", it is decompressed first. If the filename
   contains ".jsonc", then comments are removed before the JSON is parsed. */

   static jsonRead(filename: string) {
      let input = fs.readFileSync(filename).toString();
      if (filename.endsWith('.gz'))
         input = zlib.gunzipSync(input).toString();
      if (filename.endsWith('.br'))
         input = zlib.brotliDecompressSync(input).toString();
      if (filename.includes('.jsonc'))
         input = input.toString().replaceAll(/\/\*.*?\*\//gs, '').replaceAll(/\/\/.*$/gm, '');
      return JSON.parse(input) as unknown;
   }


   /* Write object to file as JSON. If the filename ends with ".gz" or ".br", then the
   file content is compressed before being written. */

   static jsonWrite(filename: string, object: unknown, replacer = null, space = 2) {
      let output: string | Buffer = JSON.stringify(object, replacer, space);
      if (filename.endsWith('.gz'))
         output = zlib.gzipSync(output);
      if (filename.endsWith('.br'))
         output = zlib.brotliCompressSync(output);
      fs.writeFileSync(filename, output);
   }
}

export default UtilNode;