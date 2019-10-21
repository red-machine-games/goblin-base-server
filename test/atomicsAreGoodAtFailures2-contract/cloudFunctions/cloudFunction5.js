await lock.some([2, 3]);

try{
    var rec2 = await getSomeonesRating(2, 'hello'),
        rec3 = await getSomeonesRating(3, 'hello');
} catch(err){}

setSomeonesRating(2, 'hello', (rec2 || 0) + 1);
setSomeonesRating(3, 'hello', (rec3 || 0) + 1);

FunctionResponse({ okay: true });