await lock.some([1, 2, 3]);

setSomeProfileNode(1, 'profileData.hello.world', 'lost 1');
setSomeProfileNode(2, 'profileData.hello.world', 'lost 2');
setSomeProfileNode(3, 'profileData.hello.world', 'lost 3');

FunctionResponse({ okay: true });