local SEGMENT = KEYS[1]
local SKIP = tonumber(KEYS[2])
local LIMIT = tonumber(KEYS[3])
local DESCENDING = (KEYS[4] == '1')

if redis.call('exists', 'rc:' .. SEGMENT) == 1 then
    local the_top_raw
    if DESCENDING then
        the_top_raw = redis.call('zrevrange', 'rc:' .. SEGMENT, SKIP, SKIP + LIMIT - 1, 'withscores')
    else
        the_top_raw = redis.call('zrange', 'rc:' .. SEGMENT, SKIP, SKIP + LIMIT - 1, 'withscores')
    end

    local the_top = {}

    for i = 1, #the_top_raw, 2 do
        table.insert(the_top, tostring(the_top_raw[i]) .. '-' .. tostring(the_top_raw[i + 1]))
    end

    local top_length = redis.call('zcard', 'rc:' .. SEGMENT)

    return table.concat(the_top, ',') .. ';' .. tostring(top_length)
else
    return nil
end