await lock.some(2);

try{
    var rec2 = await getSomeonesRating(2, 'hello');
} catch(err){}

FunctionResponse({ rec2: rec2 || null });