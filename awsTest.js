const fs = require('fs');
const config = require('./config');
const path = require('path');
const walk = require('walk');

const AWS = require('aws-sdk');
AWS.config.update(
    {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
    }
);
const s3 = new AWS.S3();

function checkFileType(filelink) {

    switch (path.extname(filelink).toLowerCase()) {
        case '.png':
            return('image/png');
            break;
        case '.gif':
            return('image/gif');
            break;
        case '.bmp':
            return('image/bmp');
            break;
        case '.jpg':
        case '.jpeg':    
            return('image/jpg');
            break;    
        case '.svg':
            return('image/svg+xml');
            break;
        case '.js':
            return('text/javascript');
            break;
        case '.css':
            return('text/css');
            break;
        case '.json':
            return('application/json');
            break;
        case '.swf':
            return('application/x-shockwave-flash');
            break;
        case '.mp3':
            return('audio/mpeg3');
            break;
        case '.eot':
            return('image/webp');
            break;
        case '.ttf':
            return('application/octet-stream');
            break;
        case '.woff':
            return('font/woff');
            break;
        case '.woff2':
            return('font/woff2');
            break;
        case '.html':
            return('text/html');
            break;
        case '.pdf':
            return('application/pdf');
            break;
        default:
            return('application/octet-stream');
    }
}

function awsUploadFile(iFile, next) {

    fs.readFile(config.rootPath + iFile, function (err, data) {
        if (err) {
            next(err);
        } else {

            const params = {
                Bucket: config.bucketName,
                Key: iFile,
                Body: data,
                ContentType: checkFileType(iFile),
                CacheControl: 'max-age=2592000',
                ACL: 'public-read'
            };

            s3.putObject(params, function(err, data) {
                if (err) {
                    next(err);
                } else {
                    console.log(" ====== Successfully uploaded data " + iFile);
                    next();
                }
            });
        }
    });
}

function awsUploadFileArray(iFiles, next) {

    let resError;
    let counter = 0;

    for (let f=0; f<iFiles.length; f++) {

        awsUploadFile(iFiles[f], function (err) {
            if (err) resError = err;
            counter ++;
            if (counter === iFiles.length) {
                next(resError);
            }
        })
    }
}

function cacheInvalidate(nameArray, next) {

    const tStamp = new Date().getTime() + parseInt(Math.random()*10000);
    const params = {
        DistributionId: config.DistributionId,
        InvalidationBatch: {
            CallerReference: tStamp.toString(),
            Paths: {
                Quantity: nameArray.length,
                Items: nameArray
            }
        }
    };
    const cloudfront = new AWS.CloudFront();
    cloudfront.createInvalidation(params, function(err) {
        next(err);
    });
}

function readDirs(dir, callback) {

    const walker  = walk.walk(dir, { followLinks: false });

    walker.on('file', function(root, stat, next) {

        const inFile = path.resolve(root, stat.name).replace(config.rootPath, '');
        awsUploadFile(inFile, function () {
            next();
        });
    });
    walker.on('end', function() {
        cacheInvalidate([dir + '/*'], function (err) {
            callback(err);
        });
    });
}

process.stdout.write(' ====== aws upload ====== ');

// ======= Upload all files in directory ======= //

// readDirs(config.rootPath + 'scripts', function (err) {
//     if (err) console.log(' ====== awsUploadFile err ' + err);
//     console.log(' ====== aws upload finished ====== ');
//     process.exit();
// });

// ======= Upload custom array of files ======= //

let awsPath = ["scripts/main.js", "styles/style.css", "pics/001.jpg"];
awsUploadFileArray(awsPath, function(err) {
    if (err) {
        console.log(' ====== awsUploadFile err ' + err);
        process.exit();
    }
    awsPath = awsPath.map(function (fName) {
        return "/" + fName;
    });
    cacheInvalidate(awsPath, function (err) {
        if (err) console.log(' ====== cacheInvalidate err ' + err);
        console.log(' ====== aws upload finished ====== ');
        process.exit();
    });
});
