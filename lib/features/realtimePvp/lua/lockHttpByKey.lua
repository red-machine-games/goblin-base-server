local BOOKING_KEY = KEYS[1]
local LOCK_TTL = KEYS[2]
local PID_THE_MUST = KEYS[3] == '1'

local the_lock = redis.call('get', 'hloc:' .. BOOKING_KEY)

if the_lock then
    return nil
else
    local pid = redis.call('hget', 'pinx:' .. BOOKING_KEY, 'pid')
    if pid or (not pid and not PID_THE_MUST) then
        redis.call('set', 'hloc:' .. BOOKING_KEY, '1', 'px', tonumber(LOCK_TTL))
    end
    return pid or '-1'
end