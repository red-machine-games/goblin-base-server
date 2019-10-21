redis.replicate_commands()

if string.split == nil then
    function string:split(inSplitPattern, outResults)
        if not outResults then
            outResults = {}
        end
        local theStart = 1
        local theSplitStart, theSplitEnd = string.find(self, inSplitPattern, theStart)
        while theSplitStart do
            table.insert(outResults, string.sub(self, theStart, theSplitStart - 1))
            theStart = theSplitEnd + 1
            theSplitStart, theSplitEnd = string.find(self, inSplitPattern, theStart)
        end
        table.insert(outResults, string.sub(self, theStart))
        return outResults
    end
end

local RESOURCES = KEYS[1]:split(';')
local LOCK_KEY = KEYS[2]
local LOCK_TIME_MS = KEYS[3]

if #RESOURCES > 1 then
    local so_failed = false
    for i=1, #RESOURCES, 1 do
        local reslk = redis.call('get', 'lk:' .. RESOURCES[i])
        if reslk and reslk ~= LOCK_KEY then
            local queue_key = 'lkq:' .. reslk
            redis.call('lpush', queue_key, LOCK_KEY)
            if not so_failed then
                so_failed = true
                redis.call('pexpire', queue_key, LOCK_TIME_MS)
            end
        end
    end
    if so_failed then
        return '0'
    end
    for i=1, #RESOURCES, 1 do
        redis.call('set', 'lk:' .. RESOURCES[i], LOCK_KEY, 'px', LOCK_TIME_MS)
    end
else
    local reslk = redis.call('get', 'lk:' .. RESOURCES[1])
    if reslk and reslk ~= LOCK_KEY then
        local queue_key = 'lkq:' .. reslk
        redis.call('lpush', queue_key, LOCK_KEY)
        redis.call('pexpire', queue_key, LOCK_TIME_MS)
        return '0'
    else
        redis.call('set', 'lk:' .. RESOURCES[1], LOCK_KEY, 'px', LOCK_TIME_MS)
    end
end

return '1'