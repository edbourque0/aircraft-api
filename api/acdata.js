const axios = require("axios");
const router = require("express").Router();
const cheerio = require("cheerio");
const fetch = require("node-fetch");

function isEven(n) {
    return n % 2 == 0;
}

router.get("", (req, res) => getData(req, res));

async function getData(req, res) {
    const reg = req.query["reg"];
    const type = req.query["type"];

    if (!reg && !type) {
        res.status(400).send("Query is invalid or not specified.");
        return;
    }

    var [photo, acData, tsData] = await Promise.all([
        getPhotoURL(reg)
    ]);

    res.status(200).send({
        aircraft_data: acData,
        photo: {
            url: photo.url,
            copyright: photo.cr,
        },
        tsData,
    });
}

async function getPhotoURL(query) {
    const [JPphoto, ANETphoto] = await Promise.all([
        _getPhotoByQueryJP(query),
        _getPhotoByQueryANET(query),
    ]);

    if (!JPphoto && !ANETphoto) {
        return "No photos found";
    }

    photo = JPphoto || ANETphoto; // format: { url: <URL>, cr: "JetPhotos / Airliners.net" }

    return photo;
}

async function _getPhotoByQueryJP(query) {
    const url = `https://www.jetphotos.com/photo/keyword/${query}`;

    const html = await axios.get(url);

    if (!html) {
        return null;
    }

    let $ = cheerio.load(html.data);

    let imageContainers = $(".result__photoLink");

    if (!imageContainers) {
        return null;
    }

    let imageContainer = imageContainers[0];

    if (!imageContainer) {
        return null;
    }

    let image = imageContainer.children[1].attribs.src;

    if (!image) {
        return null;
    }

    let split = image.substr(2).split("/");

    let id = split[split.length - 2] + "/" + split[split.length - 1];

    return {
        url: `https://cdn.jetphotos.com/full/${id}`,
        cr: "JetPhotos",
    };
}

async function _getPhotoByQueryANET(query) {
    const url = `https://www.airliners.net/search?keywords=${query}`;

    const html = await axios.get(url);

    if (!html) {
        return null;
    }

    let $ = cheerio.load(html.data);

    let imageContainers = $(".ps-v2-results-photo");

    if (!imageContainers) {
        return null;
    }

    let imageContainer = imageContainers[0];

    if (!imageContainer) {
        return null;
    }

    let imageSrc = $(imageContainer).find("img").attr("src");

    if (!imageSrc) {
        return null;
    }

    let imgURL = imageSrc.match("^[^-]*")[0] + ".jpg";

    return {
        url: imgURL,
        cr: "Airliners.net",
    };
}

module.exports = router;
