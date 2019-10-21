local SUBJECT = KEYS[1]
local ID = KEYS[2]

local score = redis.call('zscore', 'rec:' .. SUBJECT, ID)
local rank = redis.call('zrevrank', 'rec:' .. SUBJECT, ID)

return tostring(score) .. ';' .. tostring(rank)