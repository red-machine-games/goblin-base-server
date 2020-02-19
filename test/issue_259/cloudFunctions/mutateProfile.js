var locked = lock.check();
if(locked){
    if(!locked.includes(selfHumanId)){
        locked.push(selfHumanId);
        await relock.some(locked);
    }
} else {
    await lock.self();
}
MutateProfileResponse();