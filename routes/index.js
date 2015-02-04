
/*
 * GET home page.
 */
var fs = require('fs');
var unzip = require('unzip');
var parser = require('osu-parser');
var rimraf = require('rimraf');

exports.index = function(req, res){
  res.render('index', { title: 'osu!web' });
};

exports.tests = function(req, res){
  res.render('tests', { title: 'osu!web unit tests' });
};

exports.extract = function(req, res){
  var fstream;
  var hasOsz = false;

  req.busboy.on('file', function (fieldname, file, filename) {
    var split = filename.split(".");

    if(split[split.length-1] === "osz" && fieldname === "osz_file"){
      hasOsz = true;
      var path = __dirname + '/../_tmp/_osz' + new Date().getTime();
      var beatmaps = [];

      console.log("Extracting .osz file: " + filename);

      fstream = fs.createWriteStream(path + '.osz');
      fs.mkdirSync(path);
      file.pipe(fstream);

      fstream.on('close', function(){
        var imageFileName = "";
        var musicFileName = "";
        fs.createReadStream(path + '.osz')
          .pipe(unzip.Parse())
          .on('entry', function (entry) {
            var fileName = entry.path;
            if (fileName.indexOf(".osu") !== -1) {
              var osuFile = fs.createWriteStream(path + "/" + fileName);
              osuFile.on('finish', function(){
                parser.parseFile(path + "/" + fileName, function (err, beatmap) {
                  beatmaps.push(beatmap);
                  entry.autodrain();
                });
              });
              entry.pipe(osuFile);
            } else if(fileName.indexOf(".jpg") !== -1){
              var date = new Date().getTime();
              var imageFile = fs.createWriteStream(__dirname + "/../public/beatmap_data/" + date + ".jpg");
              imageFileName = date + ".jpg";
              entry.pipe(imageFile);
            } else if(fileName.indexOf(".mp3") !== -1){
              var date = new Date().getTime();
              var musicFile = fs.createWriteStream(__dirname + "/../public/beatmap_data/" + date + ".mp3");
              musicFileName = date + ".mp3";
              entry.pipe(musicFile);
            } else {
              entry.autodrain();
            }
          }).on('close', function(){
            // clean up temporary files
            rimraf(path, function(err){if(err) console.log(err);});
            fs.unlink(path + ".osz");
            res.send({beatmaps: beatmaps, image: imageFileName, music: musicFileName});
          });
      });
    }else{
      res.send({error: "This method only accepts an .osz file"});
    }
  });

  req.pipe(req.busboy);
};
