local SOCIAL_ID = KEYS[1]
local SEGMENT = KEYS[2]
local SKIP = tonumber(KEYS[3])
local LIMIT = tonumber(KEYS[4])
local SOCIAL_IDENTIFIER = KEYS[5]
local DESCENDING = (KEYS[6] == '1')

local sorting_order = DESCENDING and 'desc' or 'asc'
local the_leaders = redis.call(
    'sort', SOCIAL_IDENTIFIER .. 'fr:' .. SOCIAL_ID, 'by',
    SOCIAL_IDENTIFIER .. 'rc:*:' .. SEGMENT, 'limit', SKIP, LIMIT, sorting_order
)

if #the_leaders ~= 0 then
    local output = {}

    for i = 1, #the_leaders do
        local score = redis.call('get', SOCIAL_IDENTIFIER .. 'rc:' .. the_leaders[i] .. ':' .. SEGMENT)
        if score then
            table.insert(output, the_leaders[i] .. '-' .. score)
        end
    end

    return table.concat(output, ',') .. ';' .. redis.call('scard', SOCIAL_IDENTIFIER .. 'fr:' .. SOCIAL_ID)
else
    return nil
end
