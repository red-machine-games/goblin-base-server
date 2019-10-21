'use strict';

module.exports = {
    getScripts,
};

var scripts = {};

(() => {
    var crypto = require('crypto'),
        fs = require('fs'),
        path = require('path');

    function doGenerate(){
        exposeFolder(path.join(__dirname, '../webMiddleware/lua'), 'SessionsClient');
        exposeFolder(path.join(__dirname, '../features/matchmaking/lua'), 'MatchmakingClient');
        exposeFolder(path.join(__dirname, '../features/leaderboards/lua'), 'RecordsClient');
        exposeFolder(path.join(__dirname, '../features/realtimePvp/lua'), 'GameplayRoomClient');
        exposeFolder(path.join(__dirname, '../features/pve/lua'), 'SimpleGameplayClient');
        exposeFolder(path.join(__dirname, '../features/atomic/lua'), 'ServiceClient');
        exposeFolder(path.join(__dirname, '../generalUtils/lua/resourcesLock'), 'ResourceLockerClient');
        exposeFolder(path.join(__dirname, '../generalUtils/lua/maintenance'), 'MaintenanceClient');
    }
    function exposeFolder(folderPath, clientName){
        var filenames = fs.readdirSync(folderPath).filter(e => e.endsWith('.lua'));
        if(!scripts[clientName]){
            scripts[clientName] = {};
        }
        for(let i = 0 ; i < filenames.length ; i++){
            let fileContent = fs.readFileSync(path.join(folderPath, filenames[i]), 'utf-8'),
                scriptName = path.basename(filenames[i]).replace('.lua', ''),
                sha1 = crypto.createHash('sha1').update(Buffer.from(fileContent), 'binary').digest('hex');
            scripts[clientName][scriptName] = { sha: sha1, script: fileContent };
        }
    }

    doGenerate();
})();

function getScripts(){
    return scripts;
}