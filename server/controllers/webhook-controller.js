`use strict`;
const cacheAPIData = require(`../workers/cache-api-data.js`);
const catchAsync = require('../utils/catch-async.js');

exports.cacheNewData = catchAsync((async(req, res, next) => {
   await cacheAPIData();
   res.status(200).json({
      status: `success`,
      message: `NEW GEO-CLUSTER DOWNLOADED & CACHED`,
      requested_at: req.requestTime,
   });
}), `cacheNewDataErr`);