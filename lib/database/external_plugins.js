const config = require('../../config');
const {
	DataTypes
} = require('sequelize');

// Use a static table name or derive from phone number if available
const tableName = config.PHONE_NUMBER 
	? `external_plugins_${config.PHONE_NUMBER.replace(/[^0-9]/g, '')}` 
	: 'external_plugins';

const externalPlugins = config.DATABASE.define(tableName, {
	name: {
		type: DataTypes.STRING,
		allowNull: false
	},
	url: {
		type: DataTypes.TEXT,
		allowNull: false
	}
});

externalPlugins.sync();

async function installExternalPlugins(adres, file) {
	const existingPlugin = await externalPlugins.findOne({
		where: {
			name: file
		}
	});
	if (existingPlugin) {
		return false;
	} else {
		return await externalPlugins.create({
			url: adres,
			name: file
		});
	}
}

module.exports = {
	externalPlugins,
	installExternalPlugins
};
