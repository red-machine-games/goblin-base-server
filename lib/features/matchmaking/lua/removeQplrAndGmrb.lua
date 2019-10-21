local PID_A = KEYS[1]
local PID_B = KEYS[2]

local qplr = redis.call('hmget', 'qplr:' .. PID_A, 'ky', 'grip')
if qplr[1] and qplr[2] then
    redis.call('del', 'qplr:' .. PID_A, 'grmb:' .. qplr[2] .. ':' .. qplr[1])
end

if PID_B then
    local qplr_b = redis.call('hmget', 'qplr:' .. PID_B, 'ky', 'grip')
    if qplr_b[1] and qplr_b[2] then
        redis.call('del', 'qplr:' .. PID_B, 'grmb:' .. qplr_b[2] .. ':' .. qplr_b[1])
    end
end