`use strict`
const APP_CONFIG = require("../config/config.js");
const catchAsync = require('../utils/catch-async.js');
const chalk = require('../utils/chalk-messages.js');


exports.renderAVGDashboard = catchAsync(async(req, res, next) => {

   console.log(chalk.success(`SUCCESSFULLY CALLED 'renderAVGDashboard' VIEW CONTROLLER FN. `));
      
      res.status(200).render('dashboard', {
         title: APP_CONFIG.appTitle,
         developer: APP_CONFIG.appDeveloper,
         user: APP_CONFIG.appOwner,
         geoClusters: req.app.locals.returnedClusters,
      });

      next();

}, `renderDashboardErr`);


exports.renderLandingPage = catchAsync(async(req, res, next) => {

   console.log(chalk.success(`SUCCESSFULLY CALLED 'renderLandingPage' VIEW CONTROLLER FN. `));

   res.status(200).render('landing', {
      title: APP_CONFIG.appTitle,
      developer: APP_CONFIG.appDeveloper,
      user: APP_CONFIG.appOwner,
      totalNumClusters: req.app.locals.clustersSummary.totalNumClusters,
      totalNumFeatures: req.app.locals.clustersSummary.totalNumFeatures,
   });
   
}, `renderLandingPageErr`);