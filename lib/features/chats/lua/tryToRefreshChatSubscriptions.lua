
redis.replicate_commands()

local NOW = tonumber(KEYS[1])
local RELOADING_MS = tonumber(KEYS[2])
local BATCH_SIZE = tonumber(KEYS[3])
local BUCKET_LIFETIME_MS = tonumber(KEYS[4])

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

local prev_scan_ts = redis.call('get', 'sub_scan_ts')

if not prev_scan_ts or tonumber(prev_scan_ts) + RELOADING_MS <= NOW then
    local function process_bucket_indexes(bucket_index_key)
        local clan_id = bucket_index_key:split(':')[2]

        local outdated_buckets = redis.call('zrangebyscore', bucket_index_key, '-inf', (NOW - BUCKET_LIFETIME_MS))
        for i=1, #outdated_buckets, 1 do
            redis.call('del', 'b:' .. clan_id .. ":" .. outdated_buckets[i])
            redis.call('zrem', bucket_index_key, outdated_buckets[i])
        end
        if redis.call('zcard', bucket_index_key) == 0 then
            redis.call('del', bucket_index_key)
        end
    end

    local a_cursor = redis.call('get', 'sub_scan_cur')
    if a_cursor then
        a_cursor = tonumber(a_cursor)
    else
        a_cursor = 0
    end

    local sc = redis.call('scan', a_cursor, 'match', 'bi:*', 'count', BATCH_SIZE)

    redis.call('set', 'sub_scan_cur', sc[1])
    redis.call('set', 'sub_scan_ts', NOW)

    for i=1, #sc[2], 1 do
        process_bucket_indexes(sc[2][i])
    end
end