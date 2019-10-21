await lock.self();

var profileDataTop = await getProfileNode('profileData.maze');
profileDataTop = 3;
var val2 = await getProfileNode('profileData.hello.world');
val2 = 2;
setProfileNode('publicProfileData.experiment', 'psychology');

setProfileNode('profileData.maze', profileDataTop);
setProfileNode('profileData.hello.world', val2);

FunctionResponse({ val: (await getProfileNode('humanId')) });