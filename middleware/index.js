var request = require('request');
var appVariables = require('../AppVariables').appVariables;
// var inspectContainerURI = require('../AppVariables').inspectContainerURI;
var userModel = require('../models/user');
function requireLogin(req, res, next){
    console.log('here');
    if(req.session.userId){
        return next();
    }else{
        var error = new Error("You Must Be Logged In");
        error.status = 701;
        next(error);
    }
}

function getDockerImages(req, res, next){
    console.log("getDockerImages");
    var filteredImages =[];
    var options = {
        url: appVariables.imageRequest
    };
    request(options, function(error, response,body){
        if (!error && response.statusCode == 200) {
            console.log("parsing");
            JSON.parse(body).forEach(function(image) {
                filteredImages.push({
                    ID: image.Id,
                    imageTag : image.RepoTags[0]
                });
            });
            res.locals.dockerImages= filteredImages;
            next();
        }
        if(error){
            next(error);
        } 
    });
}

//worker function for getUserContainers
function inspectContainerURI(id){
    return `http://35.190.142.192:2375/v1.24/containers/${id}/json`;
}
function getUserContainers(req, res, next){
    //array to hold the users container information after parsing through the JSON
    var userContainersDocker = [];
    //Get the container ID's for all the user's containers
    userModel.getContainers(req.session.userId,function(error, userContainers){
        if(error){
            //catch any errors from the model static function
            next(error);
        }
        //loop through all the users containers that were returned from the database
        userContainers.forEach(function(container){
            var options = {
                url: inspectContainerURI(container.ID)
            }
            request(options, function(error, response, body){
                if (!error && response.statusCode == 200){
                    var parsedJson = JSON.parse(body);
                    userContainersDocker.push({
                        Id: parsedJson.Id,
                        image: parsedJson.Image,
                        name: parsedJson.Name,
                        status : parsedJson.State.Status
                    });
                    console.log(userContainersDocker);
                }else{
                    var error = new Error("Error while making docker API call: /v1.24/containers/id/json");
                    error.statusCode = 706;
                    next(error);
                }
            });
        });
        console.log(userContainersDocker);
        res.locals.userContainersDocker = userContainersDocker;
        console.log("next");
        next();
    });
}


module.exports.requireLogin = requireLogin;
module.exports.getDockerImages = getDockerImages;
module.exports.getUserContainers = getUserContainers;