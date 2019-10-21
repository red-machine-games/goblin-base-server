local ID = table.remove(KEYS, 1)
local COUNT = table.remove(KEYS, 1)
local SUBJECT = table.remove(KEYS, 1)
local SOCIAL = table.remove(KEYS, 1)
local ORDER = table.remove(KEYS, 1)

local leaders_ids =
    redis.call('sort', SOCIAL .. 'fr:' .. ID, 'by', SOCIAL .. 'rec:*:' .. SUBJECT .. '->score', 'limit', '0', COUNT, ORDER)

if #leaders_ids ~= 0 then
    local output = {}

    for i = 1, #leaders_ids do
        local score = redis.call('hmget', SOCIAL .. 'rec:' .. leaders_ids[i] .. ':' .. SUBJECT, 'score')
        if tostring(score[1]) ~= 'false' then
            table.insert(output, leaders_ids[i] .. ':' .. score[1])
        end
    end

    return table.concat(output, ',')
else
    return nil
end
