await lock.self();

setProfileNode('profileData.a.b.c', 1);
setProfileNode('profileData.a.b.c', 2);
setProfileNode('profileData.a.b', { c: 3 });

FunctionResponse({ okay: true });