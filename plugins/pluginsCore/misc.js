const { Jimp } = require("jimp");

async function generateProfilePicture(buffer) {
	const jimp = await Jimp.read(buffer);
	const min = jimp.width;
	const max = jimp.height;
	const cropped = jimp.crop({ x: 0, y: 0, w: min, h: max });
	return {
		img: await cropped.scaleToFit({ w: 324, h: 720 }).getBuffer("image/jpeg"),
		preview: await cropped.normalize().getBuffer("image/jpeg")
	};
}

async function updatefullpp(jid, imag, client) {
	const {
		query
	} = client;
	const {
		img
	} = await generateProfilePicture(imag);
	await query({
		tag: "iq",
		attrs: {
			to: "@s.whatsapp.net",
			type: "set",
			xmlns: "w:profile:picture"
		},
		content: [{
			tag: "picture",
			attrs: {
				type: "image"
			},
			content: img
		}]
	});
}


module.exports = {updatefullpp};
