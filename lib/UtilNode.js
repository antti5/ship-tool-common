import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import dotenv from 'dotenv';
import findConfig from 'find-config';
import Util from './Util.js';


/* Additional utility functions that only work in Node.js */

class UtilNode extends Util {

   /* Return environment variable. The given .env file is loaded with find-config
   so that it is also loaded from a parent directory.

   If the environment variable cannot be found the process exits with exit value 1. */

   static #envFileLoaded = {};

   static env(name, envFile = '.env') {
      if (envFile in UtilNode.#envFileLoaded === false) {
         dotenv.config({
            path: findConfig(envFile),
            quiet: true
         });
         UtilNode.#envFileLoaded[envFile] = true;
      }

      const value = process.env[name];
      if (value)
         return value;
      else {
         console.warn(`Environment variable ${name} not defined`);
         process.exit(1);
      }
   }


   /* Return a list of files under the given directory,
   recursively including subdirectories. */

   static walkSync(dir, filelist = []) {
      for (const file of fs.readdirSync(dir)) {
         filelist = fs.statSync(path.join(dir, file)).isDirectory() ?
            UtilNode.walkSync(path.join(dir, file), filelist) :
            filelist.concat(path.join(dir, file));
      }
      return filelist;
   }


   /* Read JSON file and return it as an Object.

   If the filename ends with ".gz" or ".br", it is decompressed first. If the filename
   contains ".jsonc", then comments are removed before the JSON is parsed. */

   static jsonRead(filename) {
      let input = fs.readFileSync(filename);
      if (filename.endsWith('.gz'))
         input = zlib.gunzipSync(input);
      if (filename.endsWith('.br'))
         input = zlib.brotliDecompressSync(input);
      if (filename.includes('.jsonc'))
         input = input.toString().replaceAll(/\/\*.*?\*\//gs, '').replaceAll(/\/\/.*$/gm, '');
      return JSON.parse(input);
   }


   /* Write object to file as JSON. If the filename ends with ".gz" or ".br", then the
   file content is compressed before being written. */

   static jsonWrite(filename, object, replacer = null, space = 2) {
      let output = JSON.stringify(object, replacer, space);
      if (filename.endsWith('.gz'))
         output = zlib.gzipSync(output);
      if (filename.endsWith('.br'))
         output = zlib.brotliCompressSync(output);
      fs.writeFileSync(filename, output);
   }
}

export default UtilNode;