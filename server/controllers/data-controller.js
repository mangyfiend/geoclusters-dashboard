`use strict`
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const catchAsync = require('../utils/catch-async.js');
const chalk = require("../utils/chalk-messages.js");


const ProcessFiles = ((root) => {

   const COMBINED_FILES_ARR = [];

   // PROMISE VERSION OF fs.readdir
   fs.readdirAsync = dirname => {
      return new Promise((resolve, reject) => {
         fs.readdir(dirname, (readdirErr, fileNames) => {
            if (readdirErr) reject(readdirErr)
            else resolve (fileNames);
         });
      });
   };

   // PROMISE VERSION OF fs.readFile();
   fs.readFileAsync = (fileName, encoding) => {
      return new Promise((resolve, reject) => {
         fs.readFile(fileName, encoding, (readFileErr, fileBuffer) => {
            if (readFileErr) reject(readFileErr)
            else resolve(fileBuffer);
         });
      });
   };

   // UTILITY FN. FOR fs.readFileAsync ... RETURNS A PROMISE
   const getFileData = (fileName) => {
      return fs.readFileAsync(path.resolve(`${__approotdir}/localdata/nga-ward-bounds-openAFRICA/${fileName}`), `utf8`);
   };

   // FN. TO GET ONLY GEOJSON FILES
   const isGeoJSONFile = (fileName) => {
      return path.extname(fileName) === '.geojson';
   };


   return {
      
      initBaseFiles: async () => { 
         try {            
            // START A BLANK nga-ward-bounds FILE
            fs.writeFile(path.resolve(`${__approotdir}/localdata/nga-ward-bounds.geojson`), ``, () => console.log(chalk.warningBright(`Base nga-ward-bounds.geojson file created`)));
         } catch (fielWriteErr) {
            throw new Error(`fielWriteErr: ${fielWriteErr.message}`);
         };   
      },

      // READ ALL THE GEOJSON FILES IN A DIR
      // FILTER OUT THOSE THAT NEED TO BE PROCESSED;
      // USE Promise.all to TIME WHEN ALL ASYNC readFiles HAS COMPLETED
      scanDirectory: async filesDirectory => {

         console.log(chalk.working(`READING GEOJSON FILE(S) DATA`));

         return fs.readdirAsync(path.resolve(`${root}/${filesDirectory}`))

            .then(gjFileNames => {
               gjFileNames = gjFileNames.filter(isGeoJSONFile);
               gjFileNames.forEach(gjFileName => console.log({gjFileName}));
               // console.log(chalk.console(JSON.stringify({gjFileNames})));
               return Promise.all(gjFileNames.map(getFileData));
            })

            .then(gjFiles => {

               gjFiles.forEach(gjFile => {
                  // console.log({gjFile});
                  console.log(chalk.working(`[ parsing file buffer ]`))
                  const geojson_file = JSON.parse(gjFile);
                  COMBINED_FILES_ARR.push(geojson_file);
               });
               
               console.log(chalk.success(`Finished combining all the files`));
               
               return COMBINED_FILES_ARR;
            })

            .catch(err => console.error(err));
      },

      returnDirectoryFiles: async filesDirectory => {
         const ngaAdmiinBoundsLvl3Files = await ProcessFiles.scanDirectory(filesDirectory);
         return ngaAdmiinBoundsLvl3Files;
      },

      getCombinedDirFiles: async filesDirectory => {
         // TODO
      },

      retreiveFilesData: async fileNamesArr => {
         for (let fileName of fileNamesArr) {
            let fileData = await fsPromises.readFile(path.resolve(`${__approotdir}/localdata/${fileName}`), `utf8`, (readFileErr, fileBuffer) => {
               if (readFileErr) throw readFileErr;
               console.log(chalk.result(`FILE READ OK - ${fileName}`));
               resolve(fileBuffer);
            });
            return fileData;
         };
      },      

   };
})(__approotdir);


const parseString = async str => {
   try {
      return JSON.parse(str);
   } catch (parseStringErr) {
      console.error(`parseStringErr: ${parseStringErr.message}`);
   };
};


exports.getAdminBoundsGeoJSON = catchAsync((async(req, res, next) => {

   console.log(chalk.success(`SUCCESSFULLY CALLED 'getAdminBoundsGeoJSON' DATA CONTROLLER FN. `));
   
   // ProcessFiles.retreiveFilesData([`nga-state-admin-bounds.geojson`, `nga-state-admin-bounds.geojson`, `nga-ward-bounds-openAFRICA.geojson`]);

   const ngaAdmiinBoundsLvl1 = await parseString(await ProcessFiles.retreiveFilesData([`nga-state-admin-bounds.geojson`]));
   const ngaAdmiinBoundsLvl2 = await parseString(await ProcessFiles.retreiveFilesData([`nga-lga-admin-bounds.geojson`]));
   // const ngaAdmiinBoundsLvl3 = await parseString(await ProcessFiles.retreiveFilesData([`/nga-ward-bounds-openAFRICA/nga-ward-bounds-openAFRICA_xaa.geojson`]));
   const ngaAdmiinBoundsLvl3 = {};

   let ngaAdminBounds;
   if (ngaAdmiinBoundsLvl1 && ngaAdmiinBoundsLvl2 && ngaAdmiinBoundsLvl3) {
      ngaAdminBounds = {
         ngaAdmiinBoundsLvl1,
         ngaAdmiinBoundsLvl2,
         ngaAdmiinBoundsLvl3,
      };
   };

   if (ngaAdminBounds) req.app.locals.ngaAdminBounds = ngaAdminBounds;
   
   next();

}), `getAdminBoundsErr`);


exports.getAdminBoundsGJ = catchAsync((async(req, res, next) => {

   console.log(chalk.success(`SUCCESSFULLY CALLED 'getAdminBoundsGJ' DATA CONTROLLER FN. `));
   
   // ProcessFiles.retreiveFilesData([`nga-state-admin-bounds.geojson`, `nga-state-admin-bounds.geojson`, `nga-ward-bounds-openAFRICA.geojson`]);

   await ProcessFiles.initBaseFiles();
   const ngaAdmiinBoundsLvl3Files = await ProcessFiles.returnDirectoryFiles(`/localdata/nga-ward-bounds-openAFRICA`);

   const ngaAdminBounds = {
      // ngaAdminBoundsLvl1: ngaAdmiinBoundsLvl1Files,
      // ngaAdminBoundsLvl2: ngaAdmiinBoundsLvl2Files,
      ngaAdminBoundsLvl3: ngaAdmiinBoundsLvl3Files
   }
   
   res.status(200).json({
      status: `success`,
      requested_at: req.requestTime,
      data: ngaAdminBounds,
   });

}), `getAdminBoundsErr`);


function combineObjArrays(...baseArrays) {
   const newObjArray = [];
   const arrays = [...baseArrays];
   arrays.forEach(array => {
      if (array) {
         array.forEach(el => {
            newObjArray.push(el);
         });
      };
   });
   // for (const baseArray in baseArrays) {
   //    for (const obj in baseArray) {
   //       newObjArray.push(obj);
   //    };
   // };
   return newObjArray;
};


function retreiveClustersData() {

   const parcelizedClustersJSON = fs.readFileSync(path.resolve(`${__approotdir}/localdata/parcelized-agcs.json`), {encoding: 'utf8'});
   const legacyClustersJSON = fs.readFileSync(path.resolve(`${__approotdir}/localdata/legacy-agcs.json`), {encoding: 'utf8'});

   let parcelizedClusters, legacyClusters;
   
   if (parcelizedClustersJSON) {
      parcelizedClusters = JSON.parse(parcelizedClustersJSON);
   };

   if (legacyClustersJSON) {
      legacyClusters = JSON.parse(legacyClustersJSON);
   };
      
   const returnedClusters = combineObjArrays(parcelizedClusters, legacyClusters);

   const clustersSummary = {
      totalNumClusters: returnedClusters.length,
      totalNumFeatures: (()=>{
         const featsCounts = [];
         for (let idx = 0; idx < returnedClusters.length; idx++) {
            const cluster = returnedClusters[idx];
            featsCounts.push(cluster.features.length);
         }
         return featsCount = featsCounts.reduce((sum, featCount) => sum + featCount);
      })(),
   };
         
   return {returnedClusters, clustersSummary};
};


exports.getClustersSummary = catchAsync(async(req, res, next) => {
   const clustersSummary = retreiveClustersData().clustersSummary;
   req.app.locals.clustersSummary = clustersSummary;
   next();
}, `getClustersSummaryErr`);


exports.getClustersData = catchAsync(async(req, res, next) => {
   
   const returnedClusters = retreiveClustersData().returnedClusters;
      
   req.app.locals.returnedClusters = returnedClusters;

   next();
   
}, `getClustersDataErr`);