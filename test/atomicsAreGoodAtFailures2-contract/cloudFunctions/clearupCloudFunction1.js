await lock.some([1, 2, 3]);

setSomeProfileNode(1, 'profileData', undefined);
setSomeProfileNode(2, 'profileData', undefined);
setSomeProfileNode(3, 'profileData', undefined);

FunctionResponse({ okay: true });