const appConfig = require("./config/config.js");
const expressServer = require("./express.js");
const dbConnect = require("./mongoose.js");
const cacheData = require(`./jobs/cache-api-data.js`) 
const logger = require("./logger.js");
const chalk = require("./utils/chalk-messages.js");

async function startServer() {
	
	await dbConnect();

	expressServer.listen(appConfig.port, () => {
		logger.info(
			chalk.running(
				`🛡️ EXPRESS server listening on port: ${appConfig.port} 🛡️`
			)
		);
	}).on("error", (err) => {
		logger.error(err);
		process.exit(1);
	});

	// await cacheData();
}

startServer();