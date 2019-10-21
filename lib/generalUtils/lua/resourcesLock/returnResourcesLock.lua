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

for i=1, #RESOURCES, 1 do
    local res_key = 'lk:' .. RESOURCES[i]
    local reslk = redis.call('get', res_key)
    if reslk and reslk == LOCK_KEY then
        redis.call('del', res_key)
    end
end

local queue_key = 'lkq:' .. LOCK_KEY
local waiting = redis.call('lrange', queue_key, '0', '-1')
redis.call('del', queue_key)

if #waiting > 0 then
    redis.call('publish', 'rs-lk', table.concat(waiting, ';'))
end