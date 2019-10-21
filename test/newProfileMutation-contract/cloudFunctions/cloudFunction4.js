await lock.selfAnd(2);

setProfileNode('profileData.hello', 'world');
setSomeProfileNode(2, 'profileData.distortion', 'irony');

FunctionResponse({ okay: 1 });