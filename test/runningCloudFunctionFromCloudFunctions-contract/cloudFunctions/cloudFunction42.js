if(args){
    let give = await run('cloudFunction42', false);
    give.lack = lock.check();
    FunctionResponse({ give });
} else {
    FunctionResponse({ exile: lock.check() })
}