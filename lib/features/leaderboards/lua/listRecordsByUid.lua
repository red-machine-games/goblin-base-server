local UID = KEYS[1]

local record = redis.call('zscore', 'rec', UID)

return record