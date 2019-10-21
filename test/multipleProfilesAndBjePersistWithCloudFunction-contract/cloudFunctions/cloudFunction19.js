await lock.some([1, 2, 3]);

setSomeProfileNode(1, 'publicProfileData', {});
setSomeProfileNode(2, 'publicProfileData', {});

setSomeProfileNode(1, 'profileData', {});
setSomeProfileNode(2, 'profileData', {});
setSomeProfileNode(3, 'profileData', {});

FunctionResponse({ okay: true });