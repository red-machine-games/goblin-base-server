await lock.self();

var profileDataNode = await getProfileNode('profileData');
if(!profileDataNode){
    profileDataNode = {};
}
profileDataNode.upgrade = 'me';

setProfileNode('profileData', profileDataNode);

FunctionResponse({ cancel: profileDataNode.cancel });